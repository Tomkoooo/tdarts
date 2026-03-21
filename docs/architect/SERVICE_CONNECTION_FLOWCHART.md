# Service Connection Flowchart

This document maps the current system architecture from UI components to API endpoints, from route handlers to service orchestration, and from services to models and external systems. It is intentionally detailed to support performance optimization and future refactoring decisions.

## SystemWideFlow

```mermaid
flowchart LR
  subgraph frontendLayer [Frontend Layer]
    pageLayer["App pages and feature components"]
    hookLayer["Hooks and client helpers"]
  end

  subgraph apiLayer [API Layer]
    routeHandlers["src/app/api/**/route.ts handlers"]
    telemetryWrapper["withApiTelemetry wrapper"]
  end

  subgraph serviceLayer [Service Layer]
    domainServices["Domain services in src/database/services"]
    crossCutting["Auth, RBAC, feature flag, subscription checks"]
  end

  subgraph dataLayer [Data and External Layer]
    mongoStore[("MongoDB and Mongoose models")]
    externalSystems["Socket server, Stripe, Mailer, Szamlazz, Nominatim"]
  end

  pageLayer -->|"UI actions and lifecycle events"| hookLayer
  hookLayer -->|"HTTP EventSource Socket.IO"| routeHandlers
  routeHandlers --> telemetryWrapper
  telemetryWrapper --> crossCutting
  crossCutting --> domainServices
  domainServices --> mongoStore
  domainServices --> externalSystems
```

## UiToApiRelations

```mermaid
flowchart LR
  subgraph uiAuth [Auth and Profile UI]
    loginPage["auth/login page"]
    registerPage["auth/register page"]
    googleComponents["Google link and callback components"]
    forgotResetComponents["Forgot and reset password forms"]
    profileHooks["useLogout useAuthSync profile views"]
  end

  subgraph uiTournament [Tournament and Match UI]
    tournamentPage["tournaments/[code] page"]
    tournamentPlayers["TournamentPlayers component"]
    groupsView["TournamentGroupsView component"]
    boardsView["TournamentBoardsView component"]
    knockoutView["TournamentKnockoutBracket component"]
  end

  subgraph uiClubLeague [Club and League UI]
    clubPage["clubs/[code] page"]
    leagueManager["LeagueManager component"]
    leagueDetailModal["LeagueDetailModal component"]
    createTournamentModal["CreateTournamentModal component"]
    myClubPage["myclub page"]
  end

  subgraph uiSearchAdmin [Search Admin and Realtime UI]
    searchPage["search page and QuickFilters"]
    mapExplorer["MapExplorer component"]
    adminPages["admin pages and telemetry dashboard"]
    feedbackTodo["FeedbackTable AdminTicketDetail TodoManager"]
    sseHook["useRealTimeUpdates hook"]
    socketHooks["useSocket useLiveMatchesFeed socketApi"]
  end

  subgraph endpointGroups [API Endpoint Groups]
    authEndpoints["/api/auth/* /api/profile/*"]
    tournamentEndpoints["/api/tournaments/* /api/matches/* /api/boards/*"]
    clubLeagueEndpoints["/api/clubs/* /api/players/* /api/feature-flags/*"]
    searchEndpoints["/api/search /api/search/metadata /api/map"]
    adminEndpoints["/api/admin/* /api/feedback/*"]
    realtimeEndpoints["/api/updates /api/socket/auth"]
    externalSocketApi["External socket API"]
  end

  loginPage -->|"login"| authEndpoints
  registerPage -->|"register verify"| authEndpoints
  googleComponents -->|"google auth link unlink"| authEndpoints
  forgotResetComponents -->|"forgot reset"| authEndpoints
  profileHooks -->|"logout callback providers"| authEndpoints

  tournamentPage -->|"summary role reopen"| tournamentEndpoints
  tournamentPlayers -->|"players waitlist notifications"| tournamentEndpoints
  groupsView -->|"group updates and finish match"| tournamentEndpoints
  boardsView -->|"board patch and board matches"| tournamentEndpoints
  knockoutView -->|"knockout and match admin"| tournamentEndpoints

  clubPage -->|"club detail role and posts"| clubLeagueEndpoints
  leagueManager -->|"list leagues feature checks"| clubLeagueEndpoints
  leagueDetailModal -->|"league players adjust points attach"| clubLeagueEndpoints
  createTournamentModal -->|"create tournament flow"| clubLeagueEndpoints
  myClubPage -->|"current user club lookup"| clubLeagueEndpoints

  searchPage -->|"global search and metadata"| searchEndpoints
  mapExplorer -->|"map query"| searchEndpoints
  adminPages -->|"stats charts users system"| adminEndpoints
  feedbackTodo -->|"feedback and todo workflows"| adminEndpoints
  sseHook -->|"EventSource stream"| realtimeEndpoints
  socketHooks -->|"socket auth bootstrap"| realtimeEndpoints
  socketHooks -->|"live socket actions"| externalSocketApi
```

## ApiToServiceRelations

```mermaid
flowchart LR
  subgraph apiDomains [Route Handler Domains]
    authRoutes["/api/auth/* /api/profile/*"]
    tournamentRoutes["/api/tournaments/* /api/matches/* /api/boards/*"]
    clubLeagueRoutes["/api/clubs/* /api/players/* /api/feature-flags/*"]
    searchRoutes["/api/search /api/map"]
    adminRoutes["/api/admin/* /api/feedback/*"]
    realtimeRoutes["/api/updates /api/socket/auth"]
  end

  subgraph coreServices [Core and Domain Services]
    authService["AuthService"]
    authorizationService["AuthorizationService"]
    tournamentService["TournamentService"]
    matchService["MatchService"]
    leagueService["LeagueService"]
    clubService["ClubService"]
    playerService["PlayerService"]
    searchService["SearchService"]
    subscriptionService["SubscriptionService"]
    featureFlagLib["FeatureFlagService in src/lib/featureFlags.ts"]
    featureFlagDb["FeatureFlagService in database/services/feature-flag.service.ts"]
    feedbackService["FeedbackService"]
    todoService["TodoService"]
    notificationService["NotificationService"]
    teamInvitationService["TeamInvitationService"]
  end

  subgraph dataExternalDeps [Models and External Dependencies]
    userModel["UserModel"]
    clubModel["ClubModel"]
    tournamentModel["TournamentModel"]
    matchModel["MatchModel"]
    leagueModel["LeagueModel"]
    playerModel["PlayerModel"]
    feedbackModel["FeedbackModel"]
    todoModel["TodoModel"]
    galleryModel["GalleryModel"]
    stripeApi["Stripe API"]
    mailerSvc["MailerService SMTP"]
    invoiceSvc["Szamlazz invoicing"]
    geocodingSvc["GeocodingService and Nominatim"]
    socketServer["External socket server"]
  end

  authRoutes --> authService
  authRoutes --> authorizationService

  tournamentRoutes --> tournamentService
  tournamentRoutes --> matchService
  tournamentRoutes --> authorizationService
  tournamentRoutes --> subscriptionService

  clubLeagueRoutes --> clubService
  clubLeagueRoutes --> leagueService
  clubLeagueRoutes --> playerService
  clubLeagueRoutes --> featureFlagLib
  clubLeagueRoutes --> featureFlagDb
  clubLeagueRoutes --> authorizationService
  clubLeagueRoutes --> subscriptionService

  searchRoutes --> searchService
  adminRoutes --> feedbackService
  adminRoutes --> todoService
  realtimeRoutes --> authService

  authorizationService --> authService
  leagueService --> authorizationService
  leagueService --> tournamentService
  clubService --> authorizationService
  tournamentService --> authorizationService
  tournamentService --> subscriptionService
  tournamentService --> playerService
  tournamentService --> teamInvitationService

  authService --> userModel
  authorizationService --> userModel
  authorizationService --> clubModel

  subscriptionService --> clubModel
  subscriptionService --> tournamentModel
  featureFlagLib --> clubModel
  featureFlagDb --> galleryModel

  tournamentService --> tournamentModel
  tournamentService --> matchModel
  tournamentService --> stripeApi
  tournamentService --> invoiceSvc
  tournamentService --> geocodingSvc

  matchService --> matchModel
  clubService --> clubModel
  clubService --> playerModel
  leagueService --> leagueModel
  leagueService --> clubModel
  leagueService --> playerModel
  playerService --> playerModel

  feedbackService --> feedbackModel
  todoService --> todoModel
  authService --> mailerSvc
  feedbackService --> mailerSvc
  realtimeRoutes --> socketServer
```

## CrossCuttingGuards

```mermaid
flowchart LR
  requestIn["Incoming request"]
  routeEntry["Route handler in src/app/api"]
  telemetry["withApiTelemetry"]
  tokenExtract["Extract token from header or cookie"]
  tokenVerify["AuthService.verifyToken"]
  userResolve["Resolve user and identity"]
  roleCheck["AuthorizationService role check"]
  flagCheck["FeatureFlagService checks"]
  subscriptionCheck["SubscriptionService limits and plan checks"]
  domainExecute["Domain service execution"]
  modelOps["Model queries and writes"]
  externalCalls["External integrations"]
  responseOut["Response with data or domain error"]

  requestIn --> routeEntry
  routeEntry --> telemetry
  telemetry --> tokenExtract
  tokenExtract --> tokenVerify
  tokenVerify --> userResolve
  userResolve --> roleCheck
  roleCheck --> flagCheck
  flagCheck --> subscriptionCheck
  subscriptionCheck --> domainExecute
  domainExecute --> modelOps
  domainExecute --> externalCalls
  modelOps --> responseOut
  externalCalls --> responseOut
```

## Endpoint and Concern Mapping

- `Auth and profile`: `/api/auth/*`, `/api/profile/*` use `AuthService` for login token verification and email flows, with route-level identity extraction from `AuthorizationService`.
- `Tournament lifecycle`: `/api/tournaments/*`, `/api/matches/*`, `/api/boards/*` route into `TournamentService` and `MatchService`, with repeated authorization and subscription checks.
- `Club and league management`: `/api/clubs/*` and league subroutes combine `FeatureFlagService` checks, role checks, and `LeagueService` plus `ClubService` orchestration.
- `Feature and plan controls`: feature availability combines env flags and club subscription state through `src/lib/featureFlags.ts`, while usage limits are enforced in `SubscriptionService`.
- `Realtime`: UI uses `/api/updates` for SSE and `/api/socket/auth` for socket JWT handoff before calling external socket APIs.
- `Telemetry`: many routes are wrapped by `withApiTelemetry`, making request and failure tracking cross-cutting rather than domain-specific.

## Refactor Readiness Notes

- Current state is route-centric under `src/app/api/**/route.ts`, while project rules target server-action-first architecture; this flowchart captures the existing route-based dependency graph as a migration baseline.
- Authorization and feature gating are partly duplicated across route handlers and services; refactor direction should centralize these checks in thin action controllers with shared guard utilities.
- Domain logic is mostly in `src/database/services/**`, but some route files still perform direct model checks; this should be reduced to preserve a clean boundary for feature slices.
- Two `FeatureFlagService` implementations exist (`src/lib/featureFlags.ts` and `src/database/services/feature-flag.service.ts`); converging these responsibilities is a high-value refactor candidate.
- The chart highlights integration hotspots (subscription limits, RBAC, realtime bridge, external billing) that should be covered by unit and end-to-end tests during migration.
