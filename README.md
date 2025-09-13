# DRIVN - Secure File Storage Platform

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-000000.svg)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![AWS S3](https://img.shields.io/badge/AWS%20S3-569A31?style=for-the-badge&logo=amazon-s3&logoColor=white)](https://aws.amazon.com/s3/)

DRIVN is a robust, full-featured Next.js application designed for secure and efficient file storage, management, and administrative control. It offers a centralized solution for organizations to handle documents with granular access permissions, leveraging modern web technologies and cloud storage.

<img src="https://res.cloudinary.com/dxqqsk0xm/image/upload/v1754724064/12823d9f-fa14-4599-88d8-093f38191159.png">

## 🚀 Features

-   **Advanced Authentication**: Secure user authentication powered by NextAuth.js, supporting email/password and Google OAuth.
-   **S3-Compatible Storage**: Flexible storage backend using your own S3-compatible storage credentials, ensuring data encryption and scalability.
-   **Dual Dashboards**: Dedicated user and administrator dashboards with distinct access levels and comprehensive permission management.
-   **Comprehensive File Operations**: Seamless upload, download, preview, rename, delete, and intuitive folder management capabilities.
-   **Real-time Analytics**: In-depth insights into storage usage, file activity, and user behavior through real-time analytics.
-   **Periodic Data Synchronization**: Automated sync service to maintain data consistency across all storage layers.
-   **Secure API**: Robust API authentication using JWT tokens for secure and reliable communication.

## 📂 Project Structure

The project follows a clear and modular structure to ensure maintainability and scalability:

```
src/
├── app/                  # Next.js App Router pages and routes
│   ├── api/              # Backend API routes (e.g., /api/admin, /api/auth)
│   ├── auth/             # Authentication-related pages (e.g., /auth/verify)
│   ├── dashboard/        # User dashboard pages
│   └── admin-dashboard/  # Admin dashboard pages
├── components/           # Reusable UI components (e.g., /components/ui, /components/dashboard)
├── models/               # Mongoose schemas for database entities (File, Folder, User)
├── services/             # Business logic and external service integrations (e.g., fileService, s3ConfigService)
├── auth/                 # NextAuth.js configuration, context, middleware, and services
└── utils/                # General utility functions and helpers (e.g., database, encryption, validation)
```

## 🛠️ Getting Started

Follow these steps to set up and run DRIVN locally.

### Prerequisites

Ensure you have the following installed:

-   [Node.js](https://nodejs.org/) (v18 or higher)
-   [pnpm](https://pnpm.io/) (package manager)
-   [MongoDB](https://www.mongodb.com/try/download/community) (local instance or cloud URI)
-   [AWS Account](https://aws.amazon.com/) for S3 (or a compatible S3 provider like Cloudflare R2, Wasabi, DigitalOcean Spaces, MinIO, Tebi, Backblaze, etc.)

### Quick Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Emmraan/drivn.git
    ```

2.  **Navigate to the project directory**:
    ```bash
    cd drivn
    ```

3.  **Install dependencies**:
    ```bash
    pnpm install
    ```

4.  **Copy environment template**:
    ```bash
    cp .env.sample .env.local
    ```

5.  Configure your `.env.local` file with your environment variables.

6.  **Start the development server**:
    ```bash
    pnpm dev
    ```

7.  **Open in browser**:
    Access the application at [http://localhost:3000](http://localhost:3000).

### ⚙️ Environment Configuration

Create a `.env.local` file in the root of your project based on the `.env.sample` template.

#### Optional: External Validation Service

```env
VALIDATION_STRONG=false # Set to true to enable external validation
VALIDATOR_API_KEY=your-validator-api-key-here
VALIDATOR_URL=https://your-validator-url-here.com/api/validate
```
#### For more detail about External Validation Service see our [form-validator repository](https://github.com/Emmraan/form-validator)

**Note**: For production deployments, ensure `NEXTAUTH_SECRET` and `JWT_SECRET` are strong, randomly generated strings, and consider additional security measures for email services.

## 🚀 Deployment

DRIVN can be easily deployed to various platforms.

### Vercel Deployment (Recommended)

The simplest way to deploy DRIVN is using [Vercel](https://vercel.com), which offers seamless integration with Next.js applications.

1.  **Push your code** to a Git repository (GitHub, GitLab, Bitbucket).
2.  **Import the project** into your Vercel dashboard.
3.  **Configure environment variables** directly within Vercel's project settings.
4.  **Deploy the application**. Vercel will automatically build and deploy your project.

For more detailed information on deploying Next.js applications, refer to the official [Next.js Deployment Documentation](https://nextjs.org/docs/app/building-your-application/deploying).

## 🤝 Contributing

We welcome contributions to DRIVN! If you'd like to contribute, please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/YourFeature`).
3.  Make your changes and commit them (`git commit -m 'Add YourFeature'`).
4.  Push to the branch (`git push origin feature/YourFeature`).
5.  Open a Pull Request.

Please ensure your code adheres to the existing style and passes all tests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support & Contact

For questions, issues, or support, please open an issue on the [GitHub repository](https://github.com/Emmraan/drivn/issues) or refer to the comprehensive [DRIVN Documentation](https://deepwiki.com/Emmraan/drivn).
