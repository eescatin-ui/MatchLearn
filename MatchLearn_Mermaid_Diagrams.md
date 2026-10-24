# MatchLearn Mermaid Diagram Source

These diagrams document the MatchLearn mobile application and its Laravel API. The class diagram is conceptual; it is not a complete backend database schema. Render with Mermaid-compatible tools or paste the code blocks into a Mermaid editor.

## 1. Conceptual Framework (Input–Process–Output)

```mermaid
flowchart LR
    subgraph INPUT["Input"]
        P["Student profile<br/>courses, program, year"]
        PREF["Study preferences<br/>style, mode, availability"]
        ACTION["Student actions<br/>search, requests, messages,<br/>sessions, reviews"]
    end

    subgraph PROCESS["Process"]
        APP["MatchLearn mobile client<br/>Expo + React Native"]
        API["Laravel REST API<br/>/api/v1"]
        AUTH["Authentication and<br/>authorization services"]
        MATCH["Match, group, message,<br/>session and notification services"]
        DB["PostgreSQL database<br/>Render deployment"]
    end

    subgraph OUTPUT["Output"]
        SUGGEST["Buddy recommendations<br/>score and reasons returned by API"]
        CONNECTIONS["Buddy and group<br/>connection workflows"]
        COLLAB["Conversations and<br/>scheduled study sessions"]
        ACTIVITY["Notifications and<br/>review information"]
    end

    P --> APP
    PREF --> APP
    ACTION --> APP
    APP <--> API
    API --> AUTH
    API --> MATCH
    MATCH <--> DB
    MATCH --> SUGGEST
    MATCH --> CONNECTIONS
    MATCH --> COLLAB
    MATCH --> ACTIVITY
    SUGGEST --> APP
    CONNECTIONS --> APP
    COLLAB --> APP
    ACTIVITY --> APP
```

## 2. Use-Case Diagram

```mermaid
flowchart LR
    STUDENT["Student"]

    subgraph MATCHLEARN["MatchLearn mobile application"]
        AUTH["Create account with verified SSCT or SNSU Google<br/>/ sign in with Google or password"]
        PROFILE["Create or edit study profile"]
        DISCOVER["Discover buddies and groups"]
        DETAILS["View match or group details"]
        BUDDY["Send / respond to buddy request"]
        GROUP["Create group / request to join"]
        GROUPADMIN["Manage group and join requests"]
        CHAT["Send direct or group messages"]
        OPENLINK["Open shared HTTP or HTTPS link"]
        SESSION["Create and manage study sessions"]
        NOTICE["View / mark notifications"]
        REVIEW["View or submit reviews"]
        REPORT["Submit or manage user report"]
        SETTINGS["Manage account / sign out<br/>set or change password"]
    end

    API["Laravel REST API"]
    BROWSER["Device browser or<br/>registered web-link handler"]

    STUDENT --> AUTH
    STUDENT --> PROFILE
    STUDENT --> DISCOVER
    STUDENT --> DETAILS
    STUDENT --> BUDDY
    STUDENT --> GROUP
    STUDENT --> GROUPADMIN
    STUDENT --> CHAT
    STUDENT --> OPENLINK
    STUDENT --> SESSION
    STUDENT --> NOTICE
    STUDENT --> REVIEW
    STUDENT --> REPORT
    STUDENT --> SETTINGS

    AUTH <--> API
    PROFILE <--> API
    DISCOVER <--> API
    DETAILS <--> API
    BUDDY <--> API
    GROUP <--> API
    GROUPADMIN <--> API
    CHAT <--> API
    OPENLINK --> BROWSER
    SESSION <--> API
    NOTICE <--> API
    REVIEW <--> API
    REPORT <--> API
    SETTINGS <--> API
```

## 3. Conceptual Class Diagram

```mermaid
classDiagram
    class User {
        +id
        +name
        +email
        +hasPassword
        +signIn()
        +updateProfile()
        +setPasswordAfterGoogleVerification()
    }
    class StudyProfile {
        +program
        +yearLevel
        +learningStyle
        +studyMode
        +academicStrengths
        +academicNeeds
        +availability
    }
    class Match {
        +compatibilityScore
        +sharedCourseCount
        +reasons
    }
    class BuddyRequest {
        +id
        +status
        +send()
        +respond()
    }
    class StudyGroup {
        +id
        +name
        +course
        +studyMode
        +create()
        +update()
    }
    class GroupJoinRequest {
        +id
        +status
        +approve()
        +decline()
    }
    class StudySession {
        +id
        +topic
        +startsAt
        +endsAt
        +location
        +status
        +updateStatus()
    }
    class Conversation {
        +id
        +type
        +unreadCount
    }
    class Message {
        +id
        +content
        +createdAt
        +send()
    }
    class Notification {
        +id
        +type
        +readAt
        +markRead()
    }
    class Review {
        +id
        +rating
        +comment
        +createdAt
    }
    class UserReport {
        +id
        +reasons
        +details
        +submit()
    }

    User "1" *-- "0..1" StudyProfile : maintains
    User "1" --> "0..*" Match : receives
    Match "*" --> "1" User : recommends
    User "1" --> "0..*" BuddyRequest : sends or receives
    User "*" -- "*" StudyGroup : membership
    StudyGroup "1" --> "0..*" GroupJoinRequest : receives
    User "1" --> "0..*" StudySession : hosts or joins
    Conversation "1" *-- "0..*" Message : contains
    User "1" --> "0..*" Message : sends
    User "1" --> "0..*" Notification : receives
    User "1" --> "0..*" Review : writes
    User "1" --> "0..*" UserReport : submits
```

## 4. Sequence Diagram: Discover Match and Send Buddy Request

```mermaid
sequenceDiagram
    actor Student
    participant App as MatchLearn Mobile App
    participant API as REST API

    Student->>App: Open Discover
    App->>API: GET /api/v1/matches
    API-->>App: Match records, scores, shared courses, reasons
    App-->>Student: Display searchable match recommendations
    Student->>App: Open a match
    App-->>Student: Show match profile and compatibility details
    Student->>App: Send buddy request
    App->>API: POST /api/v1/buddies/requests { user_id }
    alt Request accepted by API
        API-->>App: Success response
        App-->>Student: Confirm request sent
    else Request rejected or API unavailable
        API-->>App: Error response
        App-->>Student: Show error and allow retry
    end
```
