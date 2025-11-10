const apiDocumentationHtml = (clientIp, networkName) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ACHAP API Documentation</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&family=Roboto:wght@500;700&display=swap" rel="stylesheet">
  <style>
    body { 
      font-family: 'Open Sans', sans-serif; 
      margin: 0; 
      background-color: #f4f5f7; 
      color: #333; 
      display: flex;
      height: 100vh;
    }
    .sidebar {
      width: 250px;
      background-color: #fff; /* White background */
      color: #73720e; /* Dark Olive text */
      padding: 20px;
      box-sizing: border-box;
      flex-shrink: 0;
      border-right: 1px solid #dfe1e6; /* Add a separator line */
    }
    .sidebar h1 {
      font-family: 'Roboto', sans-serif;
      font-size: 1.5rem;
      margin: 0 0 2rem 0;
      color: #73720e; /* Dark Olive */
      text-align: center;
    }
    .logo {
      width: 80%;
      max-width: 150px;
      height: auto;
      display: block;
      margin: 0 auto 2rem auto; /* Centers logo and adds clear space below */
    }
    .sidebar .tab-link {
      display: block;
      font-family: 'Roboto', sans-serif;
      color: #444; /* Dark gray for inactive links */
      text-decoration: none;
      padding: 12px 15px;
      border-radius: 3px;
      margin-bottom: 8px;
      font-weight: 500;
      transition: background-color 0.2s, color 0.2s;
    }
    .sidebar .tab-link:hover {
      background-color: #f4f5f7; /* Light gray on hover */
      color: #73720e; /* Dark Olive on hover */
    }
    .sidebar .tab-link.active {
      background-color: #fd8005; /* Bright Orange for active */
      color: #fff;
    }
    .content-wrapper {
      flex-grow: 1;
      padding: 2rem 3rem;
      overflow-y: auto;
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
    }
    h2 { 
      font-family: 'Roboto', sans-serif;
      font-weight: 700;
      color: #73720e; /* Dark Olive */
      border-bottom: 2px solid #dfe1e6; 
      padding-bottom: 10px; 
      margin-top: 0;
      font-size: 1.8rem;
    }
    ul {
      list-style-type: none;
      padding-left: 0;
    }
    li { 
      background-color: #fff; 
      margin-bottom: 12px; 
      padding: 15px 20px; 
      border-radius: 5px; 
      box-shadow: rgba(9, 30, 66, 0.08) 0px 0px 0px 1px, rgba(9, 30, 66, 0.08) 0px 2px 4px 0px;
    }
    li strong { 
      color: #fd8005; /* Bright Orange */
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
      font-size: 0.95em;
      display: inline-block;
      min-width: 250px;
    }
    code { 
      background-color: #dfe1e6; 
      padding: 3px 6px; 
      border-radius: 3px; 
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
    }
    .info-box {
      margin-top: 2rem;
      padding: 15px 20px;
      background-color: #f4f5f7;
      border-left: 4px solid #73720e; /* Dark Olive accent */
      border-radius: 4px;
    }
    .info-box h3 {
      margin-top: 0;
      color: #73720e;
      font-family: 'Roboto', sans-serif;
    }
    .info-box .note {
      font-size: 0.9em;
      color: #555;
    }
  </style>
</head>
<body>
  <div class="sidebar">
    <img src="/assets/AFRICA_CHA_PLATFORM_LOGO.png" alt="ACHAP Logo" class="logo">
    <h1>API Documentation</h1>
    <a class="tab-link active" href="#" data-target="intro">Introduction</a>
    <a class="tab-link" href="#" data-target="auth">Authentication</a>
    <a class="tab-link" href="#" data-target="docs">Documents</a>
    <a class="tab-link" href="#" data-target="team">Team Management</a>
    <a class="tab-link" href="#" data-target="stats">Statistics</a>
    <a class="tab-link" href="#" data-target="health">Health Check</a>
    <a class="tab-link" href="#" data-target="roles">User Roles</a>
  </div>

  <div class="content-wrapper">
    <div id="intro" class="tab-content active">
      <h2>Introduction</h2>
      <p>Welcome to the ACHAP Document Management API. This service provides endpoints for managing users, documents, and teams.</p>
      <p>Access to this API is restricted to authorized networks via an IP whitelist. All private endpoints require a valid JWT, which is handled via secure, HttpOnly cookies (<code>accessToken</code> and <code>refreshToken</code>).</p>
      <div class="info-box">
        <h3>Your Connection Details</h3>
        <p>Network Name: <strong>${networkName}</strong></p>
        <p>IP Address: <strong>${clientIp}</strong></p>
        <p class="note"><strong>Note:</strong> The network name is based on a pre-configured list of IP addresses. For security and privacy reasons, it is not possible for the server to automatically discover the name (SSID) of your WiFi network.</p>
      </div>
    </div>

    <div id="auth" class="tab-content">
      <h2>Authentication Routes</h2>
      <ul>
        <li><strong>POST /api/auth/register</strong>: Registers a new user. (Requires: 'Admin' role)</li>
        <li><strong>POST /api/auth/bulk-register</strong>: Bulk registers new users from a CSV file (form field: <code>userfile</code>). (Requires: 'Admin' role)</li>
        <li><strong>POST /api/auth/login</strong>: Authenticates a user and returns tokens in HttpOnly cookies.</li>
        <li><strong>POST /api/auth/logout</strong>: Invalidates a user's session by deleting the refresh token.</li>
        <li><strong>POST /api/auth/refresh</strong>: Issues a new access token using the refresh token.</li>
        <li><strong>GET /api/auth/me</strong>: Get details for the currently logged-in user.</li>
      </ul>
    </div>

    <div id="docs" class="tab-content">
      <h2>Document Routes</h2>
      <ul>
        <li><strong>GET /api/documents</strong>: Lists documents. Supports pagination with <code>?page=1&limit=20</code>.</li>
        <li><strong>GET /api/documents/search</strong>: Searches documents. Supports pagination. e.g., <code>?q=report&page=1</code>.</li>
        <li><strong>POST /api/documents/upload</strong>: Uploads a new document (form field: <code>document</code>). Can include <code>accessLevel</code> in body ('private', 'team', 'public'). (Requires: 'Admin' or 'Manager' role)</li>
        <li><strong>GET /api/documents/versions/:versionId/download</strong>: Downloads a specific document version. (Requires: Auth + access)</li>
        <li><strong>DELETE /api/documents/:id</strong>: Deletes a document. (Requires: 'Admin' role or 'Owner')</li>
        <li><strong>PUT /api/documents/:id</strong>: Updates a document's properties. Body: <code>{ "accessLevel": "public", "tags": "finance,report" }</code>. (Requires: 'Admin' role or 'Owner')</li>
      </ul>
    </div>

    <div id="team" class="tab-content">
      <h2>Team Management Routes</h2>
      <ul>
        <li><strong>GET /api/team</strong>: Get all users in the manager's team. (Requires: 'Manager'/'Admin')</li>
        <li><strong>GET /api/team/available</strong>: Get all users not assigned to any team. (Requires: 'Manager'/'Admin')</li>
        <li><strong>PUT /api/team/add/:userId</strong>: Add a user to the manager's team. (Requires: 'Manager'/'Admin')</li>
        <li><strong>PUT /api/team/remove/:userId</strong>: Remove a user from the manager's team. (Requires: 'Manager'/'Admin')</li>
      </ul>
    </div>

    <div id="stats" class="tab-content">
      <h2>Statistics Routes</h2>
      <ul>
        <li><strong>GET /api/stats/dashboard</strong>: Get aggregated statistics for an admin dashboard. (Requires: 'Admin')</li>
      </ul>
    </div>

    <div id="health" class="tab-content">
      <h2>Health Check Route</h2>
      <ul>
        <li><strong>GET /api/health</strong>: Checks API and database status. Returns <code>200 OK</code> if healthy. Publicly accessible.</li>
      </ul>
    </div>

    <div id="roles" class="tab-content">
      <h2>User Roles & Permissions</h2>
      <ul>
        <li><strong>User</strong>: The default role. Can list/download public docs and docs from their manager (<code>accessLevel: 'team'</code>). Cannot upload.</li>
        <li><strong>Manager</strong>: Can upload (private, team, public), list/download docs, and manage their team.</li>
        <li><strong>Admin</strong>: Has full system privileges. Can register/bulk-register users, manage documents, manage teams, and view system statistics.</li>
      </ul>
    </div>
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const tabLinks = document.querySelectorAll('.sidebar .tab-link');
      const tabContents = document.querySelectorAll('.content-wrapper .tab-content');

      // Set initial state from hash or default to first tab
      const initialTab = window.location.hash.substring(1) || 'intro';
      
      tabLinks.forEach(link => {
        if (link.dataset.target === initialTab) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
      tabContents.forEach(content => {
        if (content.id === initialTab) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });

      tabLinks.forEach(link => {
        link.addEventListener('click', function(event) {
          event.preventDefault();
          const targetId = this.dataset.target;

          // Update URL hash
          window.location.hash = targetId;

          // Deactivate all tabs and content
          tabLinks.forEach(l => l.classList.remove('active'));
          tabContents.forEach(c => c.classList.remove('active'));

          // Activate the clicked tab and corresponding content
          this.classList.add('active');
          document.getElementById(targetId).classList.add('active');
        });
      });
    });
  </script>
</body>
</html>
`;

module.exports = { apiDocumentationHtml };