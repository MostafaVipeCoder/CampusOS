import React, { useState, useEffect, useRef } from 'react';
import { Mic, Phone, PhoneOff, Radio, Volume2, AlertCircle, X, Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface WalkieTalkieProps {
  userId: string;
  userName: string;
  branchId: string;
  isAdmin?: boolean;
  isEmbedded?: boolean;
}

export const WalkieTalkie = ({ userId, userName, branchId, isAdmin = false, isEmbedded = false }: WalkieTalkieProps) => {
  const [status, setStatus] = useState<'idle' | 'calling' | 'connected' | 'incoming'>('idle');
  const [isTalking, setIsTalking] = useState(false);
  const [remoteUser, setRemoteUser] = useState<{ id: string, name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [callQueue, setCallQueue] = useState<{ id: string, name: string, time: number }[]>([]);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<any>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const isSubscribed = useRef(false);

  const statusRef = useRef(status);
  const remoteUserRef = useRef(remoteUser);
  
  useEffect(() => {
    statusRef.current = status;
    remoteUserRef.current = remoteUser;
  }, [status, remoteUser]);

  useEffect(() => {
    if (!branchId) return;

    // Setup signaling channel
    const channelName = `support_voice_${branchId}`;
    console.log(`[WalkieTalkie] Joining channel: ${channelName}`);
    
    channelRef.current = supabase.channel(channelName, {
      config: {
        broadcast: { self: false }
      }
    });

    channelRef.current
      .on('broadcast', { event: 'call_request' }, ({ payload }: any) => {
        console.log('[WalkieTalkie] Received call_request', payload);
        if (isAdmin) {
          // Add to queue if not already there
          setCallQueue(prev => {
            if (prev.some(c => c.id === payload.userId)) return prev;
            return [...prev, { id: payload.userId, name: payload.userName, time: Date.now() }];
          });

          if (statusRef.current === 'idle') {
            setRemoteUser({ id: payload.userId, name: payload.userName });
            setStatus('incoming');
            playRingtone(payload.userName);
          }
        }
      })
      .on('broadcast', { event: 'busy' }, ({ payload }: any) => {
        if (!isAdmin && payload.targetId === userId && statusRef.current === 'calling') {
          setError("المسؤول مشغول حالياً، يرجى المحاولة لاحقاً");
          setTimeout(() => endCall(true), 3000);
        }
      })
      .on('broadcast', { event: 'call_accept' }, ({ payload }: any) => {
        console.log('[WalkieTalkie] Received call_accept', payload);
        if (!isAdmin && payload.userId === userId && statusRef.current === 'calling') {
          stopRingtone();
          startWebRTC(payload.adminId);
        }
      })
      .on('broadcast', { event: 'webrtc_signal' }, ({ payload }: any) => {
        if (payload.targetId === userId) {
          handleSignaling(payload.signalData, payload.senderId);
        }
      })
      .on('broadcast', { event: 'call_accepted_by_admin' }, ({ payload }: any) => {
        if (isAdmin && payload.targetId === branchId) {
          // If I was showing an incoming call for this user, stop it
          if (remoteUserRef.current?.id === payload.userId) {
            stopRingtone();
            setStatus('idle');
            setRemoteUser(null);
          }
          // Remove from queue
          setCallQueue(prev => prev.filter(c => c.id !== payload.userId));
        }
      })
      .on('broadcast', { event: 'call_end' }, ({ payload }: any) => {
        if (remoteUserRef.current?.id === payload.senderId) {
          endCall(true); // Silent end
        }
      })
      .on('broadcast', { event: 'ping' }, ({ payload }: any) => {
        console.log('[WalkieTalkie] Received ping', payload);
        if (isAdmin) {
          playAlertSound();
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification("تنبيه عاجل من عميل 🔔", {
              body: `العميل ${payload.userName} يناديك الآن للمساعدة`,
              icon: '/logo.png',
              tag: 'ping-alert',
              requireInteraction: true,
              silent: false
            } as any);
          }
          setError(`تنبيه: ${payload.userName} يحتاج للمساعدة فوراً!`);
          setTimeout(() => setError(null), 10000);
        }
      })
      .subscribe((status: string) => {
        console.log(`[WalkieTalkie] Subscription status: ${status}`);
        isSubscribed.current = status === 'SUBSCRIBED';
      });

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      if (isSubscribed.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'heartbeat',
          payload: { userId }
        });
      }
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      if (channelRef.current) {
        console.log(`[WalkieTalkie] Leaving channel: ${channelName}`);
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [branchId, isAdmin, userId]);

  const sendWithFallback = (event: string, payload: any) => {
    if (!channelRef.current) return;
    
    const message = {
      type: 'broadcast',
      event,
      payload
    };

    if (isSubscribed.current) {
      channelRef.current.send(message);
    } else {
      // Fallback to REST explicitly if socket is not ready yet
      // In newer SDKs, send() might handle this but warns. 
      // We can try to use untyped access or just wait for subscription.
      // For signaling, we really want the socket.
      setTimeout(() => {
        if (isSubscribed.current) channelRef.current.send(message);
      }, 500);
    }
  };

  useEffect(() => {
    if (isAdmin && status === 'idle') {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [isAdmin, status]);

  const playRingtone = (callerName?: string) => {
    if (!ringtoneRef.current) {
        ringtoneRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
        ringtoneRef.current.loop = true;
    }
    ringtoneRef.current.play().catch(e => {
        console.warn("Audio play failed, user interaction may be required:", e);
        setError("يرجى الضغط على أي مكان في الصفحة لتفعيل التنبيهات الصوتية");
    });

    // Show system notification
    if (isAdmin && 'Notification' in window && Notification.permission === 'granted') {
      new Notification("طلب مساعدة جديد", {
        body: `العميل ${callerName || remoteUser?.name || 'مجهول'} يطلب التحدث معك`,
        icon: '/logo.png',
        tag: 'support-call',
        renotify: true,
        silent: false
      } as any);
    }

    // Vibrate mobile device
    if ('vibrate' in navigator) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  };

  const playAlertSound = () => {
    // Louder digital chime sound
    const alert = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    alert.volume = 1.0;
    alert.play().catch(e => console.warn("Alert sound failed:", e));
    
    // Repeat after 1 second for emphasis
    setTimeout(() => {
      const alert2 = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      alert2.volume = 1.0;
      alert2.play().catch(() => {});
    }, 1000);
  };

  const [lastPingTime, setLastPingTime] = useState(0);
  const [pingCooldown, setPingCooldown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (pingCooldown > 0) {
      timer = setInterval(() => {
        setPingCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [pingCooldown]);

  const pingAdmin = () => {
    const now = Date.now();
    if (now - lastPingTime < 30000) {
      setError(`يرجى الانتظار ${pingCooldown} ثانية قبل الإرسال مرة أخرى`);
      return;
    }

    sendWithFallback('ping', { userId, userName });
    setLastPingTime(now);
    setPingCooldown(30);
    setError("تم إرسال تنبيه للمسؤول.. سيحضر إليك قريباً");
    setTimeout(() => setError(null), 5000);
  };

  const checkPermissions = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (result.state === 'denied') {
        setError("Microphone access is denied. Please enable it in browser settings.");
        return false;
      }
      return true;
    } catch (e) {
      // Fallback for browsers that don't support permissions query for mic
      return true;
    }
  };

  const startWebRTC = async (targetId: string) => {
    try {
      const isAllowed = await checkPermissions();
      if (!isAllowed) return;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      
      // Mute local stream initially (Toggle mode)
      stream.getAudioTracks().forEach(track => track.enabled = isTalking);

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(targetId, { ice: event.candidate });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`[WalkieTalkie] ICE State: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          setError("Connection lost. Retrying...");
          // In a real app, we might try to restart ICE here
        }
      };

      pc.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      
      if (!isAdmin) {
        const offer = await pc.createOffer({
            offerToReceiveAudio: true
        });
        await pc.setLocalDescription(offer);
        sendSignal(targetId, { sdp: offer });
      }

      pcRef.current = pc;
      setStatus('connected');
      setError(null);
    } catch (err: any) {
      console.error("WebRTC Error:", err);
      setError("Unable to access microphone. Please check permissions.");
      endCall(true);
    }
  };

  const handleSignaling = async (data: any, senderId: string) => {
    if (!pcRef.current && isAdmin && data.sdp) {
        // Admin side: Received offer
        setRemoteUser({ id: senderId, name: remoteUser?.name || 'User' });
        await startWebRTC(senderId);
    }

    const pc = pcRef.current;
    if (!pc) return;

    try {
      if (data.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        if (pc.remoteDescription?.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal(senderId, { sdp: answer });
        }
      } else if (data.ice) {
        await pc.addIceCandidate(new RTCIceCandidate(data.ice));
      }
    } catch (err) {
      console.error("Signaling error:", err);
    }
  };

  const sendSignal = (targetId: string, signalData: any) => {
    sendWithFallback('webrtc_signal', { targetId, signalData, senderId: userId });
  };

  const initiateCall = async () => {
    if (status !== 'idle') return;
    
    const isAllowed = await checkPermissions();
    if (!isAllowed) return;

    setStatus('calling');
    sendWithFallback('call_request', { userId, userName });
  };

  const acceptCall = () => {
    if (!remoteUser) return;
    stopRingtone();
    
    // Notify other admin devices to stop ringing for this user
    sendWithFallback('call_accepted_by_admin', { 
      userId: remoteUser.id, 
      targetId: branchId, // scope it to this branch
      adminId: userId 
    });

    startWebRTC(remoteUser.id);
    sendWithFallback('call_accept', { userId: remoteUser.id, adminId: userId });
    
    // Remove from local queue
    setCallQueue(prev => prev.filter(c => c.id !== remoteUser.id));
  };

  const endCall = (silent: boolean) => {
    stopRingtone();
    
    // Broadcast end call if not silent
    if (!silent) {
      sendWithFallback('call_end', { senderId: userId });
    }

    // Cleanup WebRTC
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    
    // Stop tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    // Reset UI
    setStatus('idle');
    setRemoteUser(null);
    setIsTalking(false);
    setError(null);
  };

  const togglePTT = () => {
    if (status !== 'connected' || !localStreamRef.current) return;
    
    const newTalkingState = !isTalking;
    setIsTalking(newTalkingState);
    localStreamRef.current.getAudioTracks().forEach(track => track.enabled = newTalkingState);
    
    sendWithFallback('ptt_status', { senderId: userId, isTalking: newTalkingState });
  };

  return (
    <div className="font-['Cairo']">
      <audio ref={remoteAudioRef} autoPlay />
      
      {status === 'idle' && !isAdmin && (
        <div className="flex flex-col gap-2">
          <button
            onClick={initiateCall}
            className="group relative flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black transition-all active:scale-95 shadow-lg shadow-indigo-900/30 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Radio size={14} className="animate-pulse" />
            <span className="relative z-10 uppercase tracking-widest">تحدث مع المسؤول</span>
          </button>
          
          <button
            onClick={pingAdmin}
            disabled={pingCooldown > 0}
            className={`group relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black transition-all active:scale-95 shadow-lg ${
              pingCooldown > 0 
                ? 'bg-white/5 text-slate-500 cursor-not-allowed border-transparent' 
                : 'bg-white/5 border border-white/10 hover:border-amber-500/50 text-white'
            }`}
          >
            <Bell size={14} className={pingCooldown > 0 ? 'text-slate-600' : 'text-amber-500 group-hover:animate-ring'} />
            <span className="relative z-10 uppercase tracking-widest">
              {pingCooldown > 0 ? `انتظر ${pingCooldown} ثانية` : 'مناداة المسؤول'}
            </span>
          </button>
        </div>
      )}

      {status === 'calling' && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl animate-pulse">
          <Phone className="text-amber-500 animate-bounce" size={16} />
          <span className="text-xs font-black text-amber-500">جاري الاتصال بالمسؤول...</span>
          <button onClick={() => endCall(false)} className="text-rose-500 hover:bg-rose-500/10 p-1 rounded-lg"><X size={14} /></button>
        </div>
      )}

      {isAdmin && callQueue.length > 0 && status === 'idle' && (
        <div className={`${isEmbedded ? 'w-full' : 'fixed bottom-24 right-6 z-[200] max-w-xs'} bg-slate-900 border border-indigo-500/30 p-6 rounded-[2rem] shadow-2xl animate-in slide-in-from-right-10 duration-500`}>
          <div className="flex items-center justify-between mb-4 flex-row-reverse">
             <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">طلبات مساعدة ({callQueue.length})</h3>
             <Radio size={14} className="text-indigo-500 animate-pulse" />
          </div>
          
          <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-1">
            {callQueue.map((call) => (
              <div key={call.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center justify-between flex-row-reverse">
                <div className="text-right">
                  <p className="text-sm font-black text-white">{call.name}</p>
                  <p className="text-[10px] text-slate-500 font-bold">منذ {Math.floor((Date.now() - call.time)/1000)} ثانية</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setRemoteUser({ id: call.id, name: call.name });
                      setStatus('incoming');
                      playRingtone(call.name);
                    }}
                    className="w-10 h-10 bg-emerald-600/20 text-emerald-500 rounded-xl flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all"
                  >
                    <Volume2 size={18} />
                  </button>
                  <button 
                    onClick={() => {
                      setCallQueue(prev => prev.filter(c => c.id !== call.id));
                      sendWithFallback('busy', { targetId: call.id });
                    }}
                    className="w-10 h-10 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                  >
                    <PhoneOff size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {status === 'incoming' && (
        <div className={`${isEmbedded ? 'w-full' : 'fixed bottom-24 right-6 z-[200] max-w-xs animate-in slide-in-from-right-10'} bg-slate-900 border border-indigo-500/30 p-6 rounded-[2rem] shadow-2xl duration-500`}>
          <div className="flex flex-col items-center text-center gap-4 py-4">
             <div className="w-20 h-20 bg-indigo-500 rounded-3xl flex items-center justify-center text-white animate-bounce shadow-xl shadow-indigo-500/20">
                <Phone size={40} />
             </div>
             <div className="space-y-1">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">مكالمة واردة من</p>
                <h4 className="text-2xl font-black text-white">{remoteUser?.name}</h4>
             </div>
          </div>
          <div className="flex gap-3 mt-6">
             <button 
               onClick={acceptCall}
               className="flex-1 h-14 bg-emerald-600 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/30"
             >
                <Volume2 size={24} /> قبول
             </button>
             <button 
               onClick={() => {
                 setCallQueue(prev => prev.filter(c => c.id !== remoteUser?.id));
                 endCall(false);
               }}
               className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
             >
                <PhoneOff size={24} />
             </button>
          </div>
        </div>
      )}

      {status === 'connected' && (
        <div className={`flex items-center gap-3 ${isEmbedded ? 'w-full justify-between' : (isAdmin ? 'fixed bottom-24 right-6 z-[200] bg-slate-900 border border-emerald-500/30 p-4 rounded-3xl shadow-2xl' : '')}`}>
          <div className="flex flex-col items-end gap-1 flex-1">
             <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">
                {isAdmin ? `متصل مع: ${remoteUser?.name}` : 'متصل مع المسؤول'}
             </p>
             <div 
               onClick={togglePTT}
               className={`h-14 w-full px-6 rounded-2xl font-black text-xs flex items-center justify-center gap-3 transition-all cursor-pointer select-none active:scale-95 ${
                 isTalking 
                   ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40 animate-pulse' 
                   : 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
               }`}
             >
                <Mic size={18} className={isTalking ? 'animate-bounce' : ''} />
                <span>{isTalking ? 'إيقاف الميكروفون' : 'بدأ التحدث (اضغط هنا)'}</span>
             </div>
          </div>
          <button 
            onClick={() => endCall(false)}
            className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all flex-shrink-0"
          >
             <PhoneOff size={20} />
          </button>
        </div>
      )}

      {error && (
        <div className="text-[10px] text-rose-500 flex items-center gap-1 font-bold mt-1">
          <AlertCircle size={12} />
          {error}
        </div>
      )}
    </div>
  );
};

export default WalkieTalkie;
