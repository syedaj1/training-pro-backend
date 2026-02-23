// User Types
export type UserRole = 'admin' | 'trainer' | 'learner';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  profileData?: Record<string, string | string[]>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  avatar?: string;
  profileData?: Record<string, string | string[]>;
}

// Course Types
export type CourseType = 'in-class' | 'virtual' | 'elearning';
export type CourseStatus = 'draft' | 'published' | 'archived';

export interface Course {
  id: string;
  title: string;
  description: string;
  duration: number;
  category: string;
  courseType: CourseType;
  zoomMeetingId?: string;
  zoomLink?: string;
  status?: CourseStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseRequest {
  title: string;
  description: string;
  duration: number;
  category: string;
  courseType: CourseType;
  zoomMeetingId?: string;
  zoomLink?: string;
}

// Course Module Types
export type ContentType = 'video' | 'document' | 'scorm' | 'quiz';

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  contentType: ContentType;
  contentUrl?: string;
  scormVersion?: '1.2' | '2004';
  duration: number;
  order: number;
  isRequired: boolean;
  createdAt: string;
}

export interface CreateModuleRequest {
  title: string;
  description?: string;
  contentType: ContentType;
  contentUrl?: string;
  scormVersion?: '1.2' | '2004';
  duration: number;
  isRequired: boolean;
}

// Schedule Types
export type ScheduleType = 'single' | 'multi-day' | 'batch';
export type ScheduleStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
export type SessionMode = 'virtual' | 'face-to-face';

export interface Schedule {
  id: string;
  courseId: string;
  title: string;
  type: ScheduleType;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  trainerId: string;
  location?: string;
  maxLearners: number;
  status: ScheduleStatus;
  sessionMode: SessionMode;
  zoomLink?: string;
  zoomMeetingId?: string;
  batchNumber?: number;
  groupIds?: string[];
  scheduleDays?: ScheduleDay[];
  createdAt: string;
}

export interface ScheduleDay {
  date: string;
  startTime: string;
  endTime: string;
}

export interface CreateScheduleRequest {
  courseId: string;
  title: string;
  type: ScheduleType;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  trainerId: string;
  location?: string;
  maxLearners: number;
  sessionMode: SessionMode;
  zoomLink?: string;
  zoomMeetingId?: string;
  groupIds?: string[];
  scheduleDays?: ScheduleDay[];
}

// Group Types
export interface LearnerGroup {
  id: string;
  name: string;
  description?: string;
  learnerIds: string[];
  createdBy: string;
  createdAt: string;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  learnerIds: string[];
}

// Enrollment Types
export type EnrollmentStatus = 'active' | 'completed' | 'dropped';

export interface Enrollment {
  id: string;
  scheduleId: string;
  learnerId: string;
  enrolledAt: string;
  status: EnrollmentStatus;
}

// Attendance Types
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface Attendance {
  id: string;
  scheduleId: string;
  learnerId: string;
  date: string;
  status: AttendanceStatus;
  markedBy: string;
  markedAt: string;
  notes?: string;
}

export interface MarkAttendanceRequest {
  scheduleId: string;
  learnerId: string;
  date: string;
  status: AttendanceStatus;
  notes?: string;
}

// Assignment Types
export type AssignmentType = 'document' | 'quiz' | 'question';
export type AssignmentTarget = 'all' | 'group' | 'individual';

export interface Question {
  id: string;
  text: string;
  type: 'multiple_choice' | 'short_answer' | 'essay';
  options?: string[];
  correctAnswer?: string;
  points: number;
}

export interface Assignment {
  id: string;
  scheduleId: string;
  title: string;
  description: string;
  type: AssignmentType;
  questions?: Question[];
  dueDate: string;
  maxScore: number;
  allowDocumentUpload: boolean;
  targetType: AssignmentTarget;
  targetGroupIds?: string[];
  targetLearnerIds?: string[];
  createdBy: string;
  createdAt: string;
}

export interface CreateAssignmentRequest {
  title: string;
  description: string;
  type: AssignmentType;
  questions?: Question[];
  dueDate: string;
  maxScore: number;
  allowDocumentUpload: boolean;
  targetType?: AssignmentTarget;
  targetGroupIds?: string[];
  targetLearnerIds?: string[];
}

// Submission Types
export type SubmissionStatus = 'submitted' | 'graded' | 'late';

export interface Submission {
  id: string;
  assignmentId: string;
  learnerId: string;
  submittedAt: string;
  answers?: Record<string, string>;
  documentUrl?: string;
  score?: number;
  feedback?: string;
  status: SubmissionStatus;
}

export interface CreateSubmissionRequest {
  answers?: Record<string, string>;
  documentUrl?: string;
}

export interface GradeSubmissionRequest {
  score: number;
  feedback: string;
}

// Custom Profile Field Types
export type FieldType = 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'textarea';

export interface CustomProfileField {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  options?: string[];
  required: boolean;
  order: number;
  visibleTo: UserRole[];
  createdAt: string;
}

export interface CreateProfileFieldRequest {
  name: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  visibleTo?: UserRole[];
}

// Document Credential Types
export type DocumentType = 'certificate' | 'license' | 'id' | 'qualification' | 'other';
export type CredentialStatus = 'pending' | 'approved' | 'rejected';

export interface DocumentCredential {
  id: string;
  userId: string;
  name: string;
  documentType: DocumentType;
  documentUrl: string;
  uploadedAt: string;
  status: CredentialStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  expiryDate?: string;
}

export interface CreateCredentialRequest {
  name: string;
  documentType: DocumentType;
  documentUrl: string;
  expiryDate?: string;
}

export interface ReviewCredentialRequest {
  status: CredentialStatus;
  notes?: string;
}

// Chat Types
export type ChatType = 'private' | 'group' | 'broadcast';

export interface Chat {
  id: string;
  type: ChatType;
  name?: string;
  scheduleId?: string;
  participants: string[];
  createdAt: string;
  createdBy: string;
}

export interface CreateChatRequest {
  type: ChatType;
  name?: string;
  scheduleId?: string;
  participants: string[];
}

// Message Types
export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  attachments?: string[];
  createdAt: string;
  readBy: string[];
}

export interface CreateMessageRequest {
  content: string;
  attachments?: string[];
}

// Calendar Event Types
export type EventType = 'training' | 'appointment' | 'meeting' | 'deadline';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  type: EventType;
  scheduleId?: string;
  createdBy: string;
  attendees?: string[];
  isAllDay: boolean;
  color?: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  type: EventType;
  scheduleId?: string;
  attendees?: string[];
  isAllDay?: boolean;
  color?: string;
}

// Zoho Invoice Types
export type InvoiceStatus = 'paid' | 'unpaid' | 'overdue' | 'partial';

export interface ZohoInvoice {
  id: string;
  orderNo: string;
  customerId: string;
  customerName: string;
  amount: number;
  balanceDue: number;
  status: InvoiceStatus;
  invoiceDate: string;
  dueDate: string;
}

// System Settings Types
export type SettingCategory = 'general' | 'email' | 'security' | 'integrations' | 'notifications';
export type SettingType = 'text' | 'number' | 'boolean' | 'select';

export interface SystemSetting {
  id: string;
  category: SettingCategory;
  key: string;
  value: string | boolean | number;
  label: string;
  description?: string;
  type: SettingType;
  options?: string[];
}

// Notification Preference Types
export interface NotificationPreference {
  id: string;
  role: UserRole;
  eventType: string;
  email: boolean;
  inApp: boolean;
  push: boolean;
}

// Dashboard Widget Types
export type WidgetType = 'stats' | 'chart' | 'list' | 'calendar' | 'progress';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, unknown>;
}

export interface DashboardLayout {
  id: string;
  userId: string;
  role: UserRole;
  widgets: DashboardWidget[];
  updatedAt: string;
}

// E-Learning Enrollment Types
export type ELearningStatus = 'not_started' | 'in_progress' | 'completed';

export interface ELearningEnrollment {
  id: string;
  courseId: string;
  learnerId: string;
  enrolledAt: string;
  progress: number;
  status: ELearningStatus;
  completedAt?: string;
  score?: number;
  timeSpent: number;
}

// Zoom Account Types
export interface ZoomAccount {
  id: string;
  userId: string;
  email: string;
  connected: boolean;
  connectedAt: string;
}

// Report Types
export type ReportType = 'performance' | 'attendance' | 'completion' | 'progress';

export interface ReportFilter {
  type: ReportType;
  courseId?: string;
  learnerId?: string;
  groupId?: string;
  trainerId?: string;
  scheduleId?: string;
  startDate?: string;
  endDate?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// JWT Payload
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}
