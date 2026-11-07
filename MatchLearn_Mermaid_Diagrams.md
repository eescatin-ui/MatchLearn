# MatchLearn Mermaid Diagrams

These diagrams describe the MatchLearn mobile app and Laravel API. Each diagram is kept focused so it is easier to read when rendered. Paste one fenced Mermaid block at a time into a Mermaid editor. The class diagram is conceptual, not a complete database schema.

## Project Schedule (Estimated Gantt Chart)

The task labels are shortened for readability; the dates follow the 2026 project schedule. Month-only axis labels and increased row spacing keep the chart clear. The final presentation is scheduled for 11 November 2026.

```mermaid
%%{init: {"useMaxWidth": false, "gantt": {"leftPadding": 460, "rightPadding": 64, "topPadding": 64, "barHeight": 18, "barGap": 22, "fontSize": 11, "sectionFontSize": 11, "tickInterval": "1month"}}}%%
gantt
    title MatchLearn Capstone Project Schedule (2026)
    dateFormat YYYY-MM-DD
    axisFormat %b
    tickInterval 1month

    section Planning
    Requirements :a1, 2026-01-05, 2026-01-31
    System design :a2, 2026-01-19, 2026-02-14

    section Development
    Backend and API :a3, 2026-02-16, 2026-04-11
    Mobile app :a4, 2026-02-23, 2026-05-16

    section Testing
    Integration :a5, 2026-05-18, 2026-06-13
    Testing and fixes :a6, 2026-06-15, 2026-07-04

    section Evaluation
    Pilot and survey :a7, 2026-07-06, 2026-09-12

    section Finalization
    Final revision :a8, 2026-09-14, 2026-11-07
    Presentation (11/11) :milestone, a9, 2026-11-11, 0d
```

## 1. Conceptual Framework

```mermaid
flowchart TB
    subgraph INPUT["INPUT"]
        direction LR
        PROFILE["Student profile<br/>Program, year, courses"]
        PREFERENCES["Study preferences<br/>Style, mode, availability"]
        ACTIONS["Student actions<br/>Discover, message, schedule"]
    end

    subgraph PROCESS["PROCESS"]
        direction LR
        APP["MatchLearn app<br/>Expo and React Native"]
        API["Laravel API<br/>Authenticated requests"]
        DATABASE[("PostgreSQL<br/>Application data")]
    end

    subgraph OUTPUT["OUTPUT"]
        direction LR
        MATCHES["Buddy recommendations"]
        CONNECTIONS["Buddy and group connections"]
        COORDINATION["Messages and study sessions"]
        ACTIVITY["Notifications and reviews"]
    end

    PROFILE --> APP
    PREFERENCES --> APP
    ACTIONS --> APP
    APP <--> API
    API <--> DATABASE
    API --> MATCHES
    API --> CONNECTIONS
    API --> COORDINATION
    API --> ACTIVITY
```

## 2. Student Use Cases

```mermaid
flowchart TB
    STUDENT["Student"]

    subgraph APP["MATCHLEARN MOBILE APP"]
        direction TB
        ACCOUNT["Google sign-in<br/>and study profile"]
        DISCOVER["Discover buddies<br/>and study groups"]
        CONNECT["Buddy and group<br/>requests"]
        MESSAGES["Direct and group<br/>messaging"]
        LINKS["Open a shared<br/>web link"]
        SESSIONS["Schedule and manage<br/>study sessions"]
        NOTIFICATIONS["View and manage<br/>notifications"]
        REVIEWS["Submit and view<br/>reviews"]
        SAFETY["Reports and<br/>account controls"]
    end

    API["Laravel REST API"]
    BROWSER["Device browser<br/>for shared links"]

    STUDENT --> ACCOUNT
    STUDENT --> DISCOVER
    STUDENT --> CONNECT
    STUDENT --> MESSAGES
    STUDENT --> LINKS
    STUDENT --> SESSIONS
    STUDENT --> NOTIFICATIONS
    STUDENT --> REVIEWS
    STUDENT --> SAFETY

    ACCOUNT <--> API
    DISCOVER <--> API
    CONNECT <--> API
    MESSAGES <--> API
    SESSIONS <--> API
    NOTIFICATIONS <--> API
    REVIEWS <--> API
    SAFETY <--> API
    LINKS --> BROWSER
```

## 3. Conceptual Class Diagram

```mermaid
classDiagram
    class User {
        +id
        +name
        +email
    }

    class StudyProfile {
        +program
        +yearLevel
        +learningStyle
        +studyMode
        +availability
    }

    class Match {
        +compatibilityScore
        +sharedCourses
        +reasons
    }

    class BuddyRequest {
        +id
        +status
    }

    class StudyGroup {
        +id
        +name
        +course
    }

    class StudySession {
        +id
        +topic
        +startsAt
        +status
    }

    class Message {
        +id
        +content
        +editedAt
        +replyToId
    }

    class Notification {
        +id
        +type
        +readAt
    }

    class Review {
        +id
        +rating
        +comment
    }

    User "1" *-- "0..1" StudyProfile : has
    User "1" --> "0..*" Match : receives
    User "1" --> "0..*" BuddyRequest : sends or receives
    User "*" -- "*" StudyGroup : joins
    User "1" --> "0..*" StudySession : hosts or joins
    StudyGroup "1" --> "0..*" StudySession : schedules
    User "1" --> "0..*" Message : sends
    StudyGroup "1" --> "0..*" Message : contains
    User "1" --> "0..*" Notification : receives
    User "1" --> "0..*" Review : writes
```

## 4. Discover and Request a Buddy

```mermaid
sequenceDiagram
    actor Student
    participant App as MatchLearn app
    participant API as Laravel API

    Student->>App: Open Discover
    App->>API: Request buddy recommendations
    API-->>App: Return matches, scores, and reasons
    App-->>Student: Show match list

    Student->>App: Open a match
    App-->>Student: Show profile and compatibility details
    Student->>App: Send buddy request
    App->>API: Create buddy request
    API-->>App: Confirm request or return an error
    App-->>Student: Show request result
```

## 5. Message Actions

```mermaid
sequenceDiagram
    actor Student
    participant App as MatchLearn app
    participant API as Laravel API
    participant DB as PostgreSQL

    Student->>App: Swipe to reply or long-press a message
    App-->>Student: Show actions allowed for this message

    alt Reply
        Student->>App: Send reply
        App->>API: Create message with reply_to_id
        API->>API: Check participant and conversation
        API->>DB: Save reply
        API-->>App: Return reply and preview
    else Edit own message
        Student->>App: Save edited message
        App->>API: Update message content
        API->>API: Check message ownership
        API->>DB: Save content and edited time
        API-->>App: Return updated message
    else Delete own message
        Student->>App: Confirm deletion
        App->>API: Delete message
        API->>API: Check message ownership
        API->>DB: Remove message
        API-->>App: Confirm deletion
    end
```

## 6. Select and Delete Notifications

```mermaid
sequenceDiagram
    actor Student
    participant App as MatchLearn app
    participant API as Laravel API
    participant DB as PostgreSQL

    Student->>App: Select or long-press notifications
    App-->>Student: Show selection and delete action
    Student->>App: Confirm Delete selected
    App->>API: Send selected notification IDs
    API->>API: Limit deletion to signed-in student
    API->>DB: Delete selected notifications
    API-->>App: Return remaining unread count
    App-->>Student: Update shared notification badge
```

## 7. Reschedule a Completed Session

```mermaid
sequenceDiagram
    actor Creator
    participant App as MatchLearn app
    participant API as Laravel API
    participant DB as PostgreSQL
    participant Buddy as Session participant

    Creator->>App: Choose Reschedule
    App-->>Creator: Show session form
    Creator->>App: Save new date, time, topic, or location
    App->>API: Update completed session details
    API->>API: Check creator, future time, and conflicts
    API->>DB: Save schedule as pending
    API->>DB: Remove reviews for old completed session
    API->>Buddy: Send a new session invitation
    API-->>App: Return pending session
    Buddy->>App: Accept or decline invitation
```

## 8. Discover and Join a Study Group

```mermaid
sequenceDiagram
    actor Student
    actor Admin as Group administrator
    participant App as MatchLearn app
    participant API as Laravel API

    Student->>App: Open Study groups
    App->>API: Load discoverable groups
    API-->>App: Return groups and request status
    Student->>App: Open a group
    App->>API: Load group details
    API-->>App: Return details and access options

    alt Request to join
        Student->>App: Send join request
        App->>API: Create join request
        API-->>Admin: Notify group administrator
        Admin->>API: Approve or decline request
        API-->>App: Return updated membership status
    else Cancel pending request
        Student->>App: Cancel request
        App->>API: Cancel join request
        API-->>App: Confirm cancellation
    end
```

## 9. Rapid Application Development (RAD) Model

```mermaid
flowchart LR
    REQUIREMENTS["1. Requirements Planning<br/>Define users, project scope, and core requirements"]
    USER_DESIGN["2. User Design<br/>Plan screen flows and review the design"]
    CONSTRUCTION["3. Construction<br/>Build the Expo mobile app and Laravel API<br/>Implement features in increments and refine them"]
    CUTOVER["4. Cutover<br/>Run integration and acceptance tests<br/>Deploy the backend and apply required migrations<br/>Build the Android APK and prepare user documentation"]

    REQUIREMENTS --> USER_DESIGN
    USER_DESIGN --> CONSTRUCTION
    CONSTRUCTION --> CUTOVER

    CONSTRUCTION -. "Review and refine" .-> USER_DESIGN
    USER_DESIGN -. "Adjust requirements" .-> REQUIREMENTS

    classDef phase fill:#eaf4f7,stroke:#1a5f7a,stroke-width:2px,color:#173b4a
    class REQUIREMENTS,USER_DESIGN,CONSTRUCTION,CUTOVER phase
```

The dashed arrows show RAD's iterative refinement between phases. They describe the development model and do not claim a formal user-feedback or evaluation study.
