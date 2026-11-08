export interface UserProfile {
  uid: string;
  id: string; // Chat ID like JOHN123
  email: string;
  displayName: string;
  bio: string;
  avatar: string | null;
  readReceipts?: boolean;
  createdAt?: any;
}

export interface ContactData {
  id: string;
  avatar?: string | null;
  displayName?: string;
  bio?: string;
  isGroup?: boolean;
}

export interface PollData {
  question: string;
  options: string[];
  votes?: Record<string, number>; // uid -> option index
}

export interface ContactCardData {
  id: string;
  uid: string;
  bio?: string;
  avatar?: string | null;
}

export interface LocationData {
  lat: number;
  lng: number;
}

export interface LiveLocationData {
  lat: number;
  lng: number;
  endTime?: number;
  active?: boolean;
}

export interface StatusReplyData {
  statusId: string;
  statusText?: string;
  statusImage?: string | null;
  statusBg?: string;
  authorUid: string;
  authorName: string;
}

export interface ChatMessage {
  id: string;
  senderUid: string;
  senderName: string;
  text: string;
  ts: number;
  read: boolean;
  readAt?: number;
  readBy?: Record<string, boolean>;
  delivered?: boolean;
  edited?: boolean;
  deleted?: boolean;
  imageUrl?: string;
  audioUrl?: string;
  reaction?: string;
  forwarded?: boolean;
  silent?: boolean;
  sticker?: string;
  scheduled?: boolean;
  replyTo?: {
    senderUid: string;
    senderName: string;
    text: string;
    type?: 'text' | 'image' | 'audio' | 'location' | 'liveLocation';
  };
  poll?: PollData;
  contactCard?: ContactCardData;
  location?: LocationData;
  liveLocation?: LiveLocationData;
  statusReply?: StatusReplyData;
  isAdminIntervention?: boolean;
}

export interface StatusComment {
  id: string;
  text: string;
  ts: number;
  senderUid: string;
  senderName: string;
  senderAvatar?: string | null;
}

export interface StatusItem {
  id: string;
  text: string;
  image: string | null;
  bg: string;
  ts: number;
  authorUid?: string;
  authorName?: string;
  isGroupStatus?: boolean;
  groupId?: string | null;
  viewers?: Record<string, boolean>;
  reactions?: Record<string, string>;
  comments?: Record<string, {
    text: string;
    ts: number;
    senderUid: string;
    senderName: string;
    senderAvatar?: string | null;
  }>;
}

export interface UserStatuses {
  [statusId: string]: StatusItem;
}

export interface CallData {
  id: string;
  callerUid: string;
  receiverUid: string;
  callerName: string;
  status: 'ringing' | 'connected' | 'declined' | 'ended';
  offer: {
    type: RTCSdpType;
    sdp?: string;
  };
  answer?: {
    type: RTCSdpType;
    sdp?: string;
  };
  timestamp: number;
}
