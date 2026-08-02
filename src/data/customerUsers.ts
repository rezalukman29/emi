export interface CustomerUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

export const initialCustomerUsers: Record<number, CustomerUser[]> = {
  1: [
    { id: 1001, name: 'Dewi Anjani',      email: 'dewi@anugerahwo.id',    role: 'Owner', status: 'active' },
    { id: 1002, name: 'Bagus Prasetyo',   email: 'bagus@anugerahwo.id',   role: 'Staff', status: 'active' },
  ],
  2: [
    { id: 1003, name: 'Made Wirawan',     email: 'made@balidreamevents.com', role: 'Owner', status: 'active' },
    { id: 1004, name: 'Kadek Ayu',        email: 'kadek@balidreamevents.com', role: 'Admin', status: 'active' },
  ],
  4: [
    { id: 1005, name: 'Siti Rahmawati',   email: 'siti@cahayapesta.id',   role: 'Owner', status: 'active' },
    { id: 1006, name: 'Rudi Hartono',     email: 'rudi@cahayapesta.id',   role: 'Admin', status: 'active' },
    { id: 1007, name: 'Fitri Handayani',  email: 'fitri@cahayapesta.id',  role: 'Staff', status: 'inactive' },
  ],
  6: [
    { id: 1008, name: 'Ayu Kartika',      email: 'ayu@nusantaraevent.id', role: 'Owner', status: 'active' },
  ],
  13: [
    { id: 1009, name: 'Yusuf Hidayat',    email: 'yusuf@semarangelite.com', role: 'Owner', status: 'active' },
    { id: 1010, name: 'Dian Permatasari', email: 'dian@semarangelite.com',  role: 'Staff', status: 'active' },
  ],
};
