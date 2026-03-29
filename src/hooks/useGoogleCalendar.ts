import { useState, useEffect } from 'react';
import { gapi } from 'gapi-script';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

export const useGoogleCalendar = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const start = () => {
      gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        scope: SCOPES,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
      }).then(() => {
        setIsSignedIn(gapi.auth2.getAuthInstance().isSignedIn.get());
        gapi.auth2.getAuthInstance().isSignedIn.listen(setIsSignedIn);
      });
    };
    gapi.load('client:auth2', start);
  }, []);

  const handleSignIn = () => {
    gapi.auth2.getAuthInstance().signIn();
  };

  const handleSignOut = () => {
    gapi.auth2.getAuthInstance().signOut();
  };

  const createEvent = async (booking: any, roomName: string) => {
    if (!isSignedIn) return;
    
    // booking_date + start_time/end_time in minutes
    const date = new Date(booking.booking_date);
    const start = new Date(date);
    start.setHours(Math.floor(booking.start_time / 60), booking.start_time % 60);
    
    const end = new Date(date);
    end.setHours(Math.floor(booking.end_time / 60), booking.end_time % 60);

    const event = {
      summary: `Booking for ${roomName}`,
      description: `Customer: ${booking.user_name || 'Generic'}. Status: ${booking.status}`,
      start: {
        dateTime: start.toISOString(),
        timeZone: 'Africa/Cairo',
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: 'Africa/Cairo',
      },
    };

    return gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });
  };

  const listEvents = async () => {
    if (!isSignedIn) return [];
    const response = await gapi.client.calendar.events.list({
      calendarId: 'primary',
      timeMin: (new Date()).toISOString(),
      showDeleted: false,
      singleEvents: true,
      maxResults: 100,
      orderBy: 'startTime',
    });
    return response.result.items;
  };

  return { isSignedIn, handleSignIn, handleSignOut, createEvent, listEvents };
};
