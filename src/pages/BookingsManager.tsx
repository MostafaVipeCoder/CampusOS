
import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Plus, Award, Clock, MoreVertical, TrendingUp, Calendar, Users, Monitor, PenTool, Armchair, X, CheckCircle2 } from 'lucide-react';
import { ROOMS_CONFIG, MOCK_BOOKINGS } from '../mockData';
import { Booking } from '../types';

export const BookingsManager = () => {
  const [selectedRoom, setSelectedRoom] = useState<string>('all'); // 'all' or room ID
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeModal, setActiveModal] = useState<'add' | null>(null);
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);

  // New Booking Form State
  const [bookingForm, setBookingForm] = useState({
    user: '',
    userCode: '',
    room: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    duration: 1,
    attendees: 1,
    extras: {
      chairs: false,
      screen: false,
      board: false,
      markers: false
    }
  });

  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 9 PM

  // Helper to generate days for week view
  const getWeekDays = (date: Date) => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(date);
      d.setDate(date.getDate() - date.getDay() + i);
      return d;
    });
  };

  const getBookingsForSlot = (dateStr: string, hour: number, roomId?: string) => {
    return bookings.filter(b =>
      b.date === dateStr &&
      b.startTime <= hour &&
      (b.startTime + b.duration) > hour &&
      (roomId ? b.room === roomId : true)
    );
  };

  const handleCreateBooking = () => {
    // Validate Capacity
    const room = ROOMS_CONFIG.find(r => r.id === bookingForm.room);
    if (room && bookingForm.attendees > room.capacity) {
      alert(`عفواً، سعة الغرفة ${room.capacity} فرد فقط.`);
      return;
    }

    const startHour = parseInt(bookingForm.startTime.split(':')[0]);

    // Create Booking
    const newBooking: Booking = {
      id: `BK-${Date.now()}`,
      room: bookingForm.room,
      user: bookingForm.user,
      userCode: bookingForm.userCode,
      date: bookingForm.date,
      startTime: startHour,
      duration: Number(bookingForm.duration),
      type: 'Reserved',
      attendees: Number(bookingForm.attendees),
      extras: {
        extraChairs: bookingForm.extras.chairs,
        screen: bookingForm.extras.screen,
        whiteboard: bookingForm.extras.board,
        markers: bookingForm.extras.markers
      }
    };

    setBookings([...bookings, newBooking]);
    setActiveModal(null);
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    return (
      <div className="flex-1 overflow-y-auto relative bg-slate-50/20">
        <div className="flex min-w-[800px]">
          <div className="w-20 flex flex-col bg-white border-l border-slate-100 sticky left-0 z-20">
            {hours.map(hour => (
              <div key={hour} className="h-24 border-b border-slate-50 flex items-start justify-center pt-2">
                <span className="text-[10px] font-black text-slate-400">{hour > 12 ? `${hour - 12} PM` : `${hour} AM`}</span>
              </div>
            ))}
          </div>

          <div className="flex-1 grid grid-cols-7 divide-x divide-x-reverse divide-slate-100">
            {weekDays.map((day, i) => (
              <div key={i} className="relative group min-h-full">
                {/* Column Header (Date) inside the grid for visual alignment */}
                <div className="sticky top-0 z-10 bg-white border-b border-slate-100 p-2 text-center mb-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase">{day.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                  <p className={`text-xl font-black ${day.toDateString() === new Date().toDateString() ? 'text-indigo-600' : 'text-slate-700'}`}>{day.getDate()}</p>
                </div>

                {hours.map(hour => (
                  <div key={hour} className="h-24 border-b border-slate-50/50 hover:bg-slate-50/80 transition-colors"></div>
                ))}

                {/* Render Bookings */}
                {bookings
                  .filter(b => b.room === selectedRoom && b.date === day.toISOString().split('T')[0])
                  .map(booking => (
                    <div
                      key={booking.id}
                      style={{ top: `${(booking.startTime - 8) * 96 + 60}px`, height: `${booking.duration * 96}px` }}
                      className={`absolute inset-x-1 z-10 p-2 rounded-xl shadow-lg border-r-4 flex flex-col justify-between overflow-hidden transition-all hover:scale-[1.02] cursor-pointer ${booking.type === 'Contracted' ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-emerald-50 text-emerald-800 border-emerald-400'
                        }`}
                    >
                      <div>
                        <p className="text-[10px] font-black uppercase opacity-60 flex items-center gap-1">
                          {booking.type === 'Contracted' ? <Award size={10} /> : <Clock size={10} />}
                          {booking.startTime}:00 - {booking.startTime + booking.duration}:00
                        </p>
                        <h5 className="font-black text-xs mt-1 leading-tight">{booking.user}</h5>
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    // Columns are ROOMS, Rows are HOURS
    return (
      <div className="flex-1 overflow-y-auto relative bg-slate-50/20">
        <div className="flex min-w-[1000px]">
          <div className="w-20 flex flex-col bg-white border-l border-slate-100 sticky left-0 z-20">
            {hours.map(hour => (
              <div key={hour} className="h-24 border-b border-slate-50 flex items-start justify-center pt-2">
                <span className="text-[10px] font-black text-slate-400">{hour > 12 ? `${hour - 12} PM` : `${hour} AM`}</span>
              </div>
            ))}
          </div>

          <div className="flex-1 grid grid-cols-5 divide-x divide-x-reverse divide-slate-100">
            {ROOMS_CONFIG.map(room => (
              <div key={room.id} className="relative group min-h-full">
                {/* Column Header (Room) */}
                <div className="sticky top-0 z-10 bg-white border-b border-slate-100 p-4 text-center">
                  <h4 className="font-black text-slate-700 text-sm truncate">{room.name}</h4>
                  <p className="text-[10px] text-slate-400 font-bold">{room.capacity} فرد</p>
                </div>

                {hours.map(hour => (
                  <div key={hour} className="h-24 border-b border-slate-50/50 hover:bg-slate-50/80 transition-colors"></div>
                ))}

                {/* Render Bookings for this room on selected date */}
                {bookings
                  .filter(b => b.room === room.id && b.date === currentDate.toISOString().split('T')[0])
                  .map(booking => (
                    <div
                      key={booking.id}
                      style={{ top: `${(booking.startTime - 8) * 96 + 73}px`, height: `${booking.duration * 96}px` }}
                      className={`absolute inset-x-1 z-10 p-2 rounded-xl shadow-lg border-r-4 flex flex-col justify-between overflow-hidden transition-all hover:scale-[1.02] cursor-pointer ${booking.type === 'Contracted' ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-emerald-50 text-emerald-800 border-emerald-400'
                        }`}
                    >
                      <div>
                        <p className="text-[10px] font-black uppercase opacity-60 flex items-center gap-1">
                          {booking.startTime}:00
                        </p>
                        <h5 className="font-black text-xs mt-1 leading-tight">{booking.user}</h5>
                        {booking.attendees && <span className="text-[9px] font-bold opacity-70 mt-1 block">{booking.attendees} فرد</span>}
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-['Cairo'] h-[calc(100vh-120px)] flex flex-col">
      <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex flex-wrap justify-between items-center gap-6 text-right shrink-0">
        <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto max-w-2xl no-scrollbar">
          <button
            onClick={() => setSelectedRoom('all')}
            className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${selectedRoom === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            كل الغرف (يومي)
          </button>
          {ROOMS_CONFIG.map(room => (
            <button
              key={room.id}
              onClick={() => setSelectedRoom(room.id)}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${selectedRoom === room.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {room.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {/* Date Picker (Simplified) */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 text-slate-600 font-bold text-sm">
            <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 1)))} className="hover:text-indigo-600"><ChevronRight size={18} /></button>
            <span className="px-2 min-w-[100px] text-center">
              {currentDate.toLocaleDateString('ar-EG', { month: 'long', day: 'numeric' })}
            </span>
            <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 1)))} className="hover:text-indigo-600"><ChevronLeft size={18} /></button>
          </div>

          <button
            onClick={() => setActiveModal('add')}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <Plus size={18} /> حجز جديد
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden flex-1 flex flex-col">
        {selectedRoom === 'all' ? renderDayView() : renderWeekView()}
      </div>

      {/* --- NEW BOOKING MODAL --- */}
      {activeModal === 'add' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-8 relative my-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-800">حجز جديد</h3>
                <p className="text-slate-400 text-sm font-bold mt-1">تسجيل حجز غرفة اجتماعات أو مساحة عمل</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors"><X className="text-slate-400" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Room Selection */}
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-2">اختر الغرفة / المساحة</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {ROOMS_CONFIG.map(room => (
                    <button
                      key={room.id}
                      onClick={() => setBookingForm({ ...bookingForm, room: room.id })}
                      className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${bookingForm.room === room.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-500 hover:border-slate-300'}`}
                    >
                      <span className="text-xs font-black">{room.name}</span>
                      <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border">{room.capacity} فرد</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold text-slate-500 mb-2">اسم العميل / الجهة</label>
                <input
                  type="text"
                  value={bookingForm.user}
                  onChange={(e) => setBookingForm({ ...bookingForm, user: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-black text-slate-800 outline-none focus:border-indigo-500 transition-all"
                  placeholder="مثال: شركة فودافون"
                />
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold text-slate-500 mb-2">كود العميل (اختياري)</label>
                <input
                  type="text"
                  value={bookingForm.userCode}
                  onChange={(e) => setBookingForm({ ...bookingForm, userCode: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-black text-slate-800 outline-none focus:border-indigo-500 transition-all"
                  placeholder="#CUS-123"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">التاريخ</label>
                <input
                  type="date"
                  value={bookingForm.date}
                  onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold text-slate-600 outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">من الساعة</label>
                  <select
                    value={bookingForm.startTime}
                    onChange={(e) => setBookingForm({ ...bookingForm, startTime: e.target.value })}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-3 py-3 text-sm font-bold text-slate-600 outline-none focus:border-indigo-500 transition-all"
                  >
                    {hours.map(h => <option key={h} value={`${h}:00`}>{h}:00</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">المدة (ساعات)</label>
                  <input
                    type="number" min="1" max="10"
                    value={bookingForm.duration}
                    onChange={(e) => setBookingForm({ ...bookingForm, duration: Number(e.target.value) })}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-3 py-3 text-sm font-bold text-slate-600 outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">عدد الحضور</label>
                <input
                  type="number"
                  value={bookingForm.attendees}
                  onChange={(e) => setBookingForm({ ...bookingForm, attendees: Number(e.target.value) })}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-black text-slate-800 outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Extras */}
              <div className="col-span-2 bg-slate-50 rounded-3xl p-6 border border-slate-100">
                <h4 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-500" /> احتياجات خاصة</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { id: 'chairs', label: 'كراسي زيادة', icon: Armchair },
                    { id: 'screen', label: 'شاشة عرض', icon: Monitor },
                    { id: 'board', label: 'Whiteboard', icon: PenTool },
                    { id: 'markers', label: 'أقلام بورد', icon: PenTool },
                  ].map(item => (
                    <label key={item.id} className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 cursor-pointer transition-all ${bookingForm.extras[item.id as keyof typeof bookingForm.extras] ? 'bg-white border-indigo-500 text-indigo-700 shadow-md' : 'border-transparent hover:bg-white hover:shadow-sm text-slate-400'}`}>
                      <input
                        type="checkbox" className="hidden"
                        checked={bookingForm.extras[item.id as keyof typeof bookingForm.extras]}
                        onChange={(e) => setBookingForm({
                          ...bookingForm,
                          extras: { ...bookingForm.extras, [item.id]: e.target.checked }
                        })}
                      />
                      <item.icon size={20} />
                      <span className="text-[10px] font-bold">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleCreateBooking}
              disabled={!bookingForm.user || !bookingForm.room}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              تأكيد الحجز
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
