
import { Campus, RoomConfig, Booking, Subscription, Contract } from './types';

export const CAMPUSES: Campus[] = [
  { id: '1', name: 'Campus Cloud', color: 'blue' },
  { id: '2', name: 'Campus Athar', color: 'indigo' },
];

export const ROOMS_CONFIG: RoomConfig[] = [
  { id: 'shared', name: 'المساحة المشتركة', hourlyRate: 20, capacity: 50 },
  { id: 'focus', name: 'غرفة التركيز', hourlyRate: 35, capacity: 1 },
  { id: 'meeting', name: 'غرفة الاجتماعات', hourlyRate: 150, capacity: 8, features: ['Screen', 'Whiteboard'] },
  { id: 'team', name: 'غرفة الفريق', hourlyRate: 120, capacity: 5, features: ['Whiteboard'] },
  { id: 'class', name: 'قاعة المحاضرات', hourlyRate: 250, capacity: 30, features: ['Projector', 'Sound System', 'Whiteboard'] },
];

const today = new Date().toISOString().split('T')[0];

export const MOCK_BOOKINGS: Booking[] = [
  { id: '1', room: 'r1', user: 'فريق بيكسلز', date: today, startTime: 10, duration: 3, type: 'Contracted' },
  { id: '2', room: 'r1', user: 'م. سليم', date: today, startTime: 14, duration: 1.5, type: 'Reserved' },
  { id: '3', room: 'r2', user: 'Workshop Alpha', date: today, startTime: 11, duration: 4, type: 'Contracted' },
];

export const MOCK_SUBSCRIPTIONS: Subscription[] = [
  { id: 'S1', name: 'أحمد محمد علي', code: 'C-101', type: '40 Hours Package', price: 1500, paid: 1500, remaining: 0, startDate: '2024-10-01', endDate: '2024-11-01', daysLeft: 8, totalHours: 40, usedHours: 12, status: 'Active' },
  { id: 'S2', name: 'سارة محمود', code: 'C-102', type: '100 Hours Package', price: 2500, paid: 1000, remaining: 1500, startDate: '2024-10-15', endDate: '2024-11-15', daysLeft: 22, totalHours: 100, usedHours: 98, status: 'Active' },
];

export const MOCK_CONTRACTS: Contract[] = [
  { id: 'B1', partner: 'Vodafone Egypt', type: 'Business', discount: '20%', members: 45, status: 'Active', cashback: 1200, startDate: '2024-01-01', endDate: '2025-01-01', conditionsUs: ['توفير قاعة اجتماعات مرة شهرياً', 'المشروبات الساخنة مجانية'], conditionsPartner: ['الالتزام بعدد 40 عضو على الأقل', 'سداد الاشتراك مقدماً'] },
  { id: 'ST1', partner: 'Enactus Cairo University', type: 'Student', discount: '35%', members: 120, status: 'Active', cashback: 450, startDate: '2023-09-01', endDate: '2024-06-30', conditionsUs: ['توفير Sound System', 'خصم خاص على الـ Workshop Hall'], conditionsPartner: ['وضع لوجو المكان على بانر الفريق', 'منشن في صفحة الفيسبوك'] },
];

export const CATERING_MENU = [
  { id: 'c1', name: 'قهوة تركي', price: 25 },
  { id: 'c2', name: 'نسكافيه', price: 30 },
  { id: 'c3', name: 'شاي', price: 15 },
  { id: 'c4', name: 'مياه معدنية', price: 10 },
  { id: 'c5', name: 'اسبريسو', price: 35 },
  { id: 'c6', name: 'ساندوتش تونة', price: 60 },
];

export const MOCK_INVENTORY = [
  { id: 'inv1', name: 'بن اسبريسو', category: 'مطبخ وبوفيه', stock: 15.5, unit: 'كيلو', minStock: 5, lastRestock: '2024-10-10' },
  { id: 'inv2', name: 'لبن كامل الدسم', category: 'مطبخ وبوفيه', stock: 42, unit: 'لتر', minStock: 10, lastRestock: '2024-10-12' },
  { id: 'inv3', name: 'ورق A4', category: 'أدوات مكتبية', stock: 12, unit: 'رزمة', minStock: 20, lastRestock: '2024-09-25' },
  { id: 'inv4', name: 'سكر أبيض', category: 'مطبخ وبوفيه', stock: 8, unit: 'كيلو', minStock: 10, lastRestock: '2024-10-11' },
  { id: 'inv5', name: 'أقلام جاف أزرق', category: 'أدوات مكتبية', stock: 48, unit: 'قطعة', minStock: 12, lastRestock: '2024-10-05' },
  { id: 'inv6', name: 'شاي فتلة', category: 'مطبخ وبوفيه', stock: 150, unit: 'قطعة', minStock: 50, lastRestock: '2024-10-01' },
];

export const MOCK_FINANCIAL_REPORT = Array.from({ length: 30 }, (_, i) => {
  const date = new Date('2024-10-30');
  date.setDate(date.getDate() - i);
  const income = Math.floor(Math.random() * 5000) + 2000;
  const expense = Math.floor(Math.random() * 2000) + 500;
  return {
    id: `FIN-${i}`,
    date: date.toISOString().split('T')[0],
    income,
    expense,
    net: income - expense,
    details: {
      workspace: Math.floor(income * 0.6),
      rooms: Math.floor(income * 0.3),
      catering: Math.floor(income * 0.1)
    }
  };
}).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

