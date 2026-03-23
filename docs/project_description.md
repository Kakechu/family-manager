# Project description

The application is a family manager web app that helps parents organize everyday family life in one shared place. The system provides a shared family calendar where users can create and manage events such as school activities, daycare events, hobbies, doctor appointments, and parent-teacher meetings. Events are organized using color-coded categories and can be assigned to specific family members, which makes it easy to see everyone’s schedule. In addition to scheduling, the application helps coordinate household chores, and important reminders. Users can create tasks, assign them to family members, set due dates, and comment on tasks to communicate additional information. The system also provides notifications and reminders for upcoming events and tasks.

### Tech stack

#### Frontend
Vite
React
TypeScript
Axios
Material UI
A calendar library (TBD)

#### Backend
Express
Node.js
TypeScript
PostgreSQL
Prisma

#### Other tools
Biome for linting / formatting
Zod for validation
Vitest for testing


### Project requirements

#### Functional requirements:
1. User can add family members
2. User can create calendar events
3. User can categorize events
4. User can assign events to family members
5. User can filter events by family member
6. User can create chores/tasks
7. User can create recurring chores/tasks
8. User can mark chores as completed
9. Users can comment on tasks
10. Users receive reminders for upcoming events
11. Users receive reminders for tasks

#### Non-functional requirements:
1. The backend should use a modular architecture (Express modules)
2. The web application should work on desktop and mobile browsers
3. User authentication is required to access personal data
4. User passwords must be securely stored (hashed)
5. The application should store data in a persistent PostgreSQL database
6. The user interface should be clear and easy to uses
7. The application should be implemented using TypeScript for improved maintainability and type safety