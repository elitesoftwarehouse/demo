// Booking domain entity - aligns with BookingRecord and provides safe JSON

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface BookingProps {
  id: string;
  userId: string;
  deskId: string;
  date: string; // YYYY-MM-DD
  timeSlot?: string | null;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class Booking implements BookingProps {
  id: string;
  userId: string;
  deskId: string;
  date: string;
  timeSlot?: string | null;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: BookingProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.deskId = props.deskId;
    this.date = props.date;
    this.timeSlot = props.timeSlot ?? null;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  toJSONSafe() {
    return {
      id: this.id,
      userId: this.userId,
      deskId: this.deskId,
      date: this.date,
      timeSlot: this.timeSlot ?? undefined,
      status: this.status,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
