# MatchLearn Mermaid Diagram Source

These diagrams describe the implemented MatchLearn mobile application and its Laravel API. They are source diagrams in Mermaid syntax, not screenshots or claims about research outcomes. The matching weights shown are the backend defaults; administrators can change them, provided the weights total 100.

## 1. System Architecture

```mermaid
flowchart LR
    Student["Student<br/>Android / iOS"]
    Admin["Administrator<br/>Separate web dashboard"]
    App["MatchLearn mobile client<br/>Expo + React Native"]
    Google["Google Sign-In"]
    API["Laravel 12 REST API<br/>/api/v1"]
    Auth["Google ID-token verification<br/>Institutional email check<br/>Sanctum access tokens"]
    Services["Profile, matching, buddy,<br/>group, messaging, session,<br/>review, report and notification services"]
    DB[("PostgreSQL<br/>Render deployment")]

    Student --> App
    App <--> Google
    App <-->|"HTTPS JSON API"| API
    Admin <-->|"Admin API"| API
    API --> Auth
    API --> Services
    Auth <--> DB
    Services <--> DB
```

## 2. Conceptual Framework (Input–Process–Output)

```mermaid
flowchart LR
    subgraph INPUT["Input"]
        ID["Google identity token<br/>SSCT or SNSU email"]
        PROFILE["Student profile<br/>program, year, courses"]
        PREFERENCES["Study preferences<br/>learning style, study mode,<br/>academic strengths and needs,<br/>availability"]
        ACTIONS["Student actions<br/>discover, request, message,<br/>create groups and sessions"]
    end

    subgraph PROCESS["Process"]
        AUTH["Verify Google token<br/>and institutional domain"]
        APP["MatchLearn mobile client<br/>Expo + React Native"]
        API["Authenticated Laravel API<br/>Sanctum-protected routes"]
        MATCH["Weighted compatibility<br/>scoring and ranking"]
        COLLAB["Buddy, group, messaging,<br/>session and review workflows"]
        DATA[("PostgreSQL data store")]
    end

    subgraph OUTPUT["System outputs"]
        RECOMMEND["Ranked study-buddy<br/>recommendations"]
        CONNECTION["Buddy connections<br/>and study groups"]
        COORDINATION["Direct/group messages<br/>and scheduled sessions"]
        ACTIVITY["In-app notifications<br/>and review information"]
    end

    ID --> AUTH
    PROFILE --> APP
    PREFERENCES --> APP
    ACTIONS --> APP
    AUTH --> API
    APP <--> API
    API <--> MATCH
    API <--> COLLAB
    MATCH <--> DATA
    COLLAB <--> DATA
    MATCH --> RECOMMEND
    COLLAB --> CONNECTION
    COLLAB --> COORDINATION
    COLLAB --> ACTIVITY
    RECOMMEND --> APP
    CONNECTION --> APP
    COORDINATION --> APP
    ACTIVITY --> APP
```

## 3. Use-Case Diagram

```mermaid
flowchart LR
    Student["Student"]
    Admin["Administrator"]

    subgraph Mobile["MatchLearn mobile application"]
        LOGIN["Sign in or create account<br/>with Google"]
        PROFILE["Create and edit<br/>study profile"]
        DISCOVER["Discover and refresh<br/>buddy matches"]
        BUDDY["Send and respond to<br/>buddy requests"]
        GROUP["Discover, create and manage<br/>study groups and join requests"]
        MESSAGE["Send direct and<br/>group messages"]
        SESSION["Schedule and manage<br/>study sessions"]
        NOTIFY["View and mark<br/>notifications"]
        REVIEW["Submit and view<br/>reviews"]
        REPORT["Submit user reports"]
        ACCOUNT["Manage account<br/>and sign out"]
    end

    subgraph AdminWeb["Separate administrator web dashboard"]
        USERS["Manage account status"]
        REPORTS["Review user reports"]
        WEIGHTS["Manage match weights"]
    end

    Student --> LOGIN
    Student --> PROFILE
    Student --> DISCOVER
    Student --> BUDDY
    Student --> GROUP
    Student --> MESSAGE
    Student --> SESSION
    Student --> NOTIFY
    Student --> REVIEW
    Student --> REPORT
    Student --> ACCOUNT
    Admin --> USERS
    Admin --> REPORTS
    Admin --> WEIGHTS
```

## 4. Conceptual Domain Class Diagram

```mermaid
classDiagram
    class User {
        +id
        +name
        +email
        +isAdmin
        +isSuspended
    }
    class Profile {
        +institution
        +program
        +yearLevel
        +learningStyle
        +studyMode
        +academicStrengths
        +academicNeeds
    }
    class StudyMatch {
        +compatibilityScore
        +sharedCourseCount
        +reasons
    }
    class BuddyRequest {
        +status
        +requesterId
        +recipientId
    }
    class StudyGroup {
        +name
        +course
        +schedule
        +studyMode
    }
    class GroupJoinRequest {
        +status
    }
    class StudySession {
        +topic
        +startsAt
        +endsAt
        +location
        +status
    }
    class DirectConversation {
        +userOneId
        +userTwoId
    }
    class StudyMessage {
        +content
        +createdAt
    }
    class ActivityNotification {
        +type
        +readAt
    }
    class Review {
        +rating
        +comment
    }
    class UserReport {
        +reasons
        +status
    }

    User "1" --> "0..1" Profile : owns
    User "1" --> "0..*" StudyMatch : receives
    StudyMatch "*" --> "1" User : recommends
    User "1" --> "0..*" BuddyRequest : sends or receives
    User "*" -- "*" StudyGroup : membership
    StudyGroup "1" --> "0..*" GroupJoinRequest : receives
    User "1" --> "0..*" StudySession : hosts or joins
    DirectConversation "1" --> "0..*" StudyMessage : contains
    StudyGroup "1" --> "0..*" StudyMessage : contains
    User "1" --> "0..*" StudyMessage : sends
    User "1" --> "0..*" ActivityNotification : receives
    User "1" --> "0..*" Review : writes
    User "1" --> "0..*" UserReport : submits
```

## 5. Google Sign-In and Account Creation

```mermaid
sequenceDiagram
    actor Student
    participant App as MatchLearn mobile app
    participant Google as Google Sign-In
    participant API as Laravel API
    participant DB as PostgreSQL

    Student->>App: Choose sign in or create account
    App->>Google: Request Google authentication
    Google-->>App: Return Google ID token
    opt New account
        Student->>App: Enter full name
    end
    App->>API: POST /api/v1/auth/google with ID token and optional name
    API->>Google: Verify ID token and claims
    Google-->>API: Verified email and identity claims
    API->>API: Check @ssct.edu.ph or @snsu.edu.ph domain
    API->>DB: Find existing account; create only for new account flow
    DB-->>API: User record
    API-->>App: Sanctum token and user data
    App->>App: Store token securely
    App-->>Student: Open MatchLearn
```

## 6. Match-Scoring Workflow

```mermaid
flowchart TD
    START["Student profile is available"] --> CANDIDATES["Load other active users<br/>with completed profiles"]
    CANDIDATES --> COMPARE["Calculate criterion scores"]
    COMPARE --> COURSE["Course overlap"]
    COMPARE --> ACADEMIC["Academic complementarity"]
    COMPARE --> PROGRAM["Program or department"]
    COMPARE --> STYLE["Learning-style compatibility"]
    COMPARE --> SCHEDULE["Availability overlap"]
    COMPARE --> YEAR["Year-level proximity"]
    COMPARE --> MODE["Study-mode compatibility"]
    COURSE --> WEIGHT["Apply configured weights<br/>(defaults total 100)"]
    ACADEMIC --> WEIGHT
    PROGRAM --> WEIGHT
    STYLE --> WEIGHT
    SCHEDULE --> WEIGHT
    YEAR --> WEIGHT
    MODE --> WEIGHT
    WEIGHT --> RESULT{"Score above zero?"}
    RESULT -- No --> OMIT["Do not return candidate"]
    RESULT -- Yes --> SAVE["Save score, shared courses<br/>and match reasons"]
    SAVE --> SORT["Sort recommendations<br/>from highest score"]
    SORT --> DISPLAY["Return recommendations<br/>to Discover screen"]
```

## 7. Study-Group Discovery, Join Requests, Cancellation, and Invitations

```mermaid
sequenceDiagram
    actor Student
    actor Admin as Group administrator
    participant App as MatchLearn mobile app
    participant API as Laravel API
    participant DB as PostgreSQL

    Student->>App: Open Study groups in Discover
    App->>API: GET /api/v1/groups/discover
    API->>DB: Retrieve discoverable groups and student's request state
    DB-->>API: Group summaries and pending state
    API-->>App: Groups and request or invitation status
    Student->>App: Open any group, including as a nonmember
    App->>API: GET /api/v1/groups/{id}
    API->>DB: Load details, members, ratings, session total, and own status
    DB-->>API: Group data and membership/request state
    API-->>App: Details and permitted action

    alt No membership, request, or invitation
        Student->>App: Request to join
        App->>API: POST /api/v1/groups/{id}/join
        API->>DB: Create pending join request
        API-->>App: Request pending
    else Pending request
        Student->>App: Cancel request
        App->>API: DELETE /api/v1/groups/{id}/join-requests
        API->>DB: Mark request cancelled
        API-->>App: Request cancelled
    else Invitation received
        Student->>App: Accept or decline invitation
        App->>API: PATCH /api/v1/groups/{id}/invitations/{requestId}
        alt Accept
            API->>DB: Add student as group member
            API-->>App: Invitation accepted
        else Decline
            API->>DB: Mark invitation declined
            API-->>App: Invitation declined
        end
    else Member
        App-->>Student: Show member actions and group conversation
    end

    opt Admin invites an accepted paired buddy
        Admin->>App: Choose buddy from Members card
        App->>API: POST /api/v1/groups/{id}/invitations
        API->>DB: Create invitation and activity notification
        API-->>App: Invitation sent
        App-->>Student: Show invitation with Accept and Decline actions
    end
```
