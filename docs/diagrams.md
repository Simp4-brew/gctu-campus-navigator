# GCTU Campus Navigator Diagrams

## 1. High-level architecture

```mermaid
flowchart LR
    User[User] --> Frontend[React Frontend]
    Frontend --> API[Express API]
    Frontend --> Map[Leaflet Map]
    Frontend --> GPS[Browser Geolocation]
    Frontend --> PWA[Service Worker]
    API --> DB[MongoDB]
```

## 2. Campus search flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant D as MongoDB

    U->>F: Enter search term
    F->>A: "GET /api/buildings/search?q=..."
    A->>D: Text search buildings
    D-->>A: Matching results
    A-->>F: Building list
    F-->>U: Show results and route option
```

## 3. Map rendering and navigation flow

```mermaid
flowchart TD
    Start[Select start/end] --> Route[Find shortest path]
    Route --> Steps[Build turn-by-turn steps]
    Steps --> Map[Render Leaflet map]
    Map --> Overlay[Draw route polyline]
    Overlay --> GPS[Show live or simulated GPS]
    GPS --> UI[Display directions and status]
```

## 4. Backend API route structure

```mermaid
flowchart TD
    Client[Client] --> API["/api/"]
    API --> Buildings["/buildings + /graph"]
    API --> Help["/faqs + /contacts"]
    API --> Tickets["/tickets"]
    API --> Admin["/admin/login"]
    Buildings --> Models["Building + Graph models"]
    Help --> HelpModels["Faq + Contact models"]
    Tickets --> Public["POST /api/tickets (public)"]
    Tickets --> Protected["PATCH /api/tickets/:ticketId (JWT)"]
    Admin --> AdminModel["Admin model"]
```

## 5. Database schema

```mermaid
erDiagram
    BUILDING ||--o{ GRAPH_NODE : uses
    BUILDING ||--o{ GRAPH_EDGE : connects
    BUILDING ||--o{ ROOM : contains

    BUILDING {
        string id
        string name
        string category
        number lat
        number lng
    }

    GRAPH_NODE {
        string id
        string name
        number lat
        number lng
        string type
    }

    GRAPH_EDGE {
        string from
        string to
    }

    ROOM {
        string name
        string floor
    }

    FAQ {
        string faqId
        string question
        string answer
    }

    CONTACT {
        string dept
        string phone
    }

    ADMIN {
        string id
        string username
        string password
    }

    TICKET {
        string ticketId
        string subject
        string status
    }
```

The schema now includes an Admin collection for backend authentication.

## 6. Auth flow

```mermaid
sequenceDiagram
    participant U as Admin User
    participant F as Frontend
    participant B as Backend
    participant M as Admin Model
    participant J as JWT

    U->>F: Submit username/password
    F->>B: "POST /api/admin/login"
    B->>M: Find admin by username
    M-->>B: Admin record
    B->>B: Compare password with bcrypt
    alt Credentials valid
        B->>J: Sign JWT
        J-->>B: JWT token
        B-->>F: "200 OK + JWT"
        F->>F: Store token locally
    else Invalid credentials
        B-->>F: "401 Invalid credentials"
    end

    F->>B: "PATCH /api/tickets/:ticketId" with Bearer token
    B->>B: Verify JWT in auth middleware
    alt JWT valid
        B-->>F: Update ticket
    else JWT missing or invalid
        B-->>F: "401 Unauthorized"
    end
```
