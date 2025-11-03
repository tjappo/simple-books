import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';
import {auth} from 'express-openid-connect';
import session from 'express-session';
import {join} from 'path';
import {Request, Response, NextFunction} from 'express';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Set global prefix for all API routes
    app.setGlobalPrefix('api');

    // Enable CORS only if FRONTEND_URL is set (for separate frontend development)
    if (process.env.FRONTEND_URL) {
        app.enableCors({
            origin: process.env.FRONTEND_URL,
            credentials: true,
        });
    }

    // Configure session middleware
    app.use(
        session({
            secret: process.env.SESSION_SECRET || 'default-secret-change-in-production',
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000, // 24 hours
            },
        }),
    );

    // Configure OIDC authentication
    const config = {
        authRequired: false,
        auth0Logout: true,
        baseURL: process.env.BASE_URL || 'http://localhost:3000',
        clientID: process.env.AUTH0_CLIENT_ID,
        clientSecret: process.env.AUTH0_CLIENT_SECRET,
        issuerBaseURL: process.env.AUTH0_ISSUER_URL,
        secret: process.env.AUTH0_SECRET,
        authorizationParams: {
            response_mode: 'query', // Use 'query' for HTTP, prevents form_post warning
            response_type: 'code',
        },
        routes: {
            login: '/auth/login',
            logout: '/auth/logout',
            callback: '/auth/callback',
        },
    };

    app.use(auth(config));

    // SPA fallback - serve index.html for non-API, non-asset routes
    // This must be registered AFTER all routes are defined
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.use((req: Request, res: Response, next: NextFunction) => {
        // Skip API and auth routes
        if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
            return next();
        }
        // Skip if the path has a file extension (likely a static asset)
        if (req.path.includes('.')) {
            return next();
        }
        // Serve index.html for all other routes (SPA routing)
        res.sendFile(join(__dirname, '..', '..', '..', 'frontend', 'dist', 'index.html'));
    });

    const port = process.env.PORT || 3000;
    await app.listen(port);

    console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
