# 📊 FamilyManager – Database Schema

## 1. Family
- `id` (PK)  
- `name`  

---

## 2. User
- `id` (PK)  
- `email` (UNIQUE)  
- `passwordHash`  
- `role` (parent / child)  
- `familyId` (FK → Family)  

---

## 3. FamilyMember
- `id` (PK)  
- `firstName`  
- `lastName`  
- `dateOfBirth` (optional)  
- `role` (child / adult)  
- `familyId` (FK → Family)  
- `userId` (optional FK → User)  

---

## 4. Event
- `id` (PK)  
- `title`  
- `description`  
- `startTime`  
- `endTime`  
- `categoryId` (FK → EventCategory)  
- `createdBy` (FK → User)  
- `familyId` (FK → Family)  

---

## 5. EventCategory
- `id` (PK)  
- `name` (e.g., School, Hobby, Doctor)  
- `color` (optional)  

---

## 6. Task
- `id` (PK)  
- `title`  
- `description`  
- `createdBy` (FK → User)  
- `dueDate`  
- `isCompleted`  
- `recurrenceType` (none / daily / weekly / monthly)  
- `categoryId` (FK → TaskCategory)  
- `familyId` (FK → Family)  

---

## 7. TaskCategory
- `id` (PK)  
- `name` (e.g., Chore, Homework, Errand)  
- `color` (optional)  

---

## 8. Comment
- `id` (PK)  
- `text`  
- `taskId` (FK → Task)  
- `userId` (FK → User)  
- `createdAt`  

---

## 9. Notification
- `id` (PK)  
- `userId` (FK → User)  
- `taskId` (optional FK → Task)  
- `eventId` (optional FK → Event)  
- `message`  
- `type` (taskReminder / eventReminder / other)  
- `isRead`  
- `createdAt`  

---

## 10. TaskAssignment
- `taskId` (PK, FK → Task)  
- `familyMemberId` (PK, FK → FamilyMember)  

> One row = one task assigned to one family member

---

## 11. EventAssignment
- `eventId` (PK, FK → Event)  
- `familyMemberId` (PK, FK → FamilyMember)  
- `attendanceStatus` (pending / attending / not_attending / maybe)  

> One row = one family member’s participation status for one event