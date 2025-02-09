export interface ChurchMember {
    memberID: number;
    memberName: string;
    memberAlias: string;
    memberLocalChurchID: number;
    isActive: boolean;
    memberSex: string;
    memberAge?: number;
    memberSince: string; // Date format: YYYY-MM-DD
    memberEmail?: string;
    memberPhoneNum?: string;
    memberRole?: string;
    baptismDay?: string;
    baptisedBy?: string;
    baptismChurch?: string;
    baptismRepresentative?: string;
    confirmationDay?: string;
    confirmedBy?: string;
    confirmationChurch?: string;
    confirmationWitness?: string;
    consecrationDay?: string;
    consecratedBy?: string;
    consecrationChurch?: string;
    consecrationRepresentative?: string;
  }
  

export interface LocalChurch {
    heroImage: string;
    localChurchId: number;
    localChurchName: string;
    localChurchLocation: string;
    localChurchClass: string;
    localChurchAddress: string;
    localChurchPhone: string;
    localChurchEmail: string;
    localChurchLeader: string;
    localChurchDescription: string;
    localChurchCoordinates: string;
    images: string[];
    clergy: { id: string; name: string; portrait: string }[];
    upcomingEvents: { id: string; name: string }[];
    pastEvents: { id: string; name: string }[];
    members: { id: string; name: string }[];
    announcements: { id: string; message: string }[];
  }
  

export interface Clergy {
    clergyID: number;
    clergyRank: number;
    clergyName: string;
    clergyPicture: string;
    description: string;

  }
  

export interface Event {
    eventID: number;
    eventTitle: string;
    eventDescription: string;
    eventCategory?: string;
    eventLevel: number;
    eventLevelID: number;
    eventStratDate: string;
    eventStratTime: string;
    eventEndDate: string;
    eventEndTime: string;
    eventOrganizers: string;
    eventSpecialGuests?: string;
    eventLocationChurch: string;
    eventCoverPhoto?: string;
    eventTargetAttendees?: string;
    eventTheme?: string;
    eventActive?: number;
}

export interface Announcement {
    announcementID: number;
    announcementTitle: string;
    announcementDescription: string;
    announcementTargetAudience?: string;
    announcementLevel: number;
    announcementLevelID: number;
    announcementStratDate: Date;
    announcementActive?: number;
  }

export interface LeadershipBoard {
    boardID: number;
    leadershipLevel: number;
    levelID: number;
    dateFormed?: Date;
    boardTenure?: number;
    boardDescription?: string;
    chairmanName?: string;
    chairladyName?: string;
    secretaryName?: string;
    treasurerName?: string;
    vChairmanName?: string;
    vChairladyName?: string;
    vSecretaryName?: string;
    vTreasurerName?: string;
}