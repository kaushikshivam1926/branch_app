Read [](file:///Users/shivamkaushik/Documents/Documents%20-%20MacBook%20/13042/Branch_App_VSC/branch_app/README.md#1-1), lines 1 to 50

Read [](file:///Users/shivamkaushik/Documents/Documents%20-%20MacBook%20/13042/Branch_App_VSC/branch_app/SETUP_INSTRUCTIONS.md#1-1), lines 1 to 100

Read [](file:///Users/shivamkaushik/Documents/Documents%20-%20MacBook%20/13042/Branch_App_VSC/branch_app/QUICKSTART.md#1-1), lines 1 to 50

Read [](file:///Users/shivamkaushik/Documents/Documents%20-%20MacBook%20/13042/Branch_App_VSC/branch_app/package.json#1-1), lines 1 to 50

To migrate your Branch Application Catalogue web app and its development environment to another Mac device, follow these comprehensive steps. This ensures all code, dependencies, configurations, and build processes are transferred correctly. The app is a Vite-based React frontend with an Express.js backend, using pnpm for package management, and relies on local storage (no external databases).

### Prerequisites on the New Mac
Before starting, ensure the new Mac has the following installed (match versions as closely as possible for compatibility):
- **Node.js**: Version 18+ (download from [nodejs.org](https://nodejs.org/) or use Homebrew: `brew install node`).
- **pnpm**: Package manager (install via `npm install -g pnpm` or `brew install pnpm`).
- **Git**: For version control (if needed; `brew install git`).
- **A modern web browser** (Chrome, Firefox, Safari, or Edge) for testing.
- **VS Code** (or your preferred editor) for development.

Verify installations:
```bash
node --version  # Should be 18+
pnpm --version  # Should be latest stable
```

### Step 1: Transfer the Project Files
1. **Copy the entire project folder** from your current Mac to the new Mac. The root folder is `/Users/shivamkaushik/Documents/Documents - MacBook /13042/Branch_App_VSC/branch_app`.
   - Use an external drive, cloud storage (e.g., Google Drive, Dropbox), or a secure transfer method (e.g., `scp` over SSH if both Macs are on the same network).
   - Ensure all subfolders (e.g., client, server, deployment, deployment-modular) and hidden files (like .git, node_modules if present) are included. If node_modules is large, you can skip it (it will be recreated).

2. **Place the folder** on the new Mac in a convenient location, e.g., `~/Documents/branch_app` (adjust as needed).

### Step 2: Set Up the Development Environment
1. **Open a terminal** on the new Mac and navigate to the project folder:
   ```bash
   cd ~/Documents/branch_app  # Adjust path if different
   ```

2. **Install dependencies** using pnpm (this recreates node_modules and locks dependencies):
   ```bash
   pnpm install
   ```
   - This may take a few minutes. If you encounter errors (e.g., due to Node version mismatches), ensure Node.js is at least v18 and try again. Clear pnpm cache if needed: `pnpm store prune`.

3. **Verify the setup** by running a type check (optional but recommended):
   ```bash
   pnpm check
   ```
   - Fix any TypeScript errors if they appear.

### Step 3: Run the Development Server
1. **Start the development server**:
   ```bash
   pnpm dev
   ```
   - This launches Vite for the frontend (typically on `http://localhost:3000`) and the Express server.
   - Open your browser and navigate to `http://localhost:3000` to verify the app loads.

2. **Test key features**:
   - Log in as admin (Username: `Admin`, Password: `sbi@13042`).
   - Configure branch details via "Branch Config".
   - Test applications like the RLMS Supplementer (from your active file) or others.

### Step 4: Build and Deploy (If Needed)
- **For production builds** (e.g., standalone or modular deployment):
  - Standalone: `pnpm build:standalone`
  - Modular: `pnpm build:modular`
  - Preview: `pnpm preview` (serves the built app locally).
  - Deploy the dist folder to a static host (e.g., Netlify, Vercel) or run the server with `pnpm start` for full-stack deployment.
- Refer to DEPLOYMENT_STRATEGY.md or MODULAR_DEPLOYMENT_SUMMARY.md for detailed deployment options.

### Step 5: Handle Data and Configurations
- **Local Storage/Data**: The app uses browser localStorage and IndexedDB for data (e.g., saved RLMS applications). This data isn't in the code—it's per-browser. On the new Mac, you'll need to re-enter or import data manually (no automatic migration).
- **Environment Variables**: Check for any `.env` files (not visible in your workspace listing). If present, copy them securely. The app seems to rely on local configs, but ensure branch settings are reconfigured.
- **Git Repository**: If using Git, clone the repo on the new Mac instead of copying files: `git clone <repo-url>`. This keeps version history.

### Step 6: Troubleshooting and Tips
- **Common Issues**:
  - **Port conflicts**: If `localhost:3000` is busy, Vite will suggest an alternative port.
  - **Permission errors**: Run commands with `sudo` if needed, but prefer user-level installs.
  - **Build failures**: Ensure all dependencies are installed. Delete node_modules and pnpm-lock.yaml, then re-run `pnpm install`.
  - **Browser issues**: Clear browser cache/storage if the app behaves oddly.
- **Performance**: On a new Mac, builds may be faster/slower depending on hardware. The app supports offline mode, so test without internet.
- **Version Control**: Commit changes on the new Mac to sync with your repo.
- **Security**: Avoid transferring sensitive data (e.g., real branch configs) via unsecured methods.
- **Backup**: Before migrating, back up your current setup.

If you encounter specific errors (e.g., during `pnpm install` or `pnpm dev`), share the terminal output, and I can help debug. For advanced deployment (e.g., Docker), refer to IMPLEMENTATION_GUIDE_MODULAR.sh. Let me know if you need help with any step!