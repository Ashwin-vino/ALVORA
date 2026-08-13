const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const session = require('express-session');
const passport = require('passport');

// =====================================================
// LOAD ENVIRONMENT VARIABLES
// =====================================================
dotenv.config();

const supabase = require('./config/supabase');
const SupabaseSessionStore = require('./config/sessionStore');

// =====================================================
// PASSPORT CONFIGURATION
// =====================================================
require('./config/passport')(passport);

// =====================================================
// EXPRESS APP
// =====================================================
const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

// =====================================================
// ENVIRONMENT VARIABLES
// =====================================================
const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
    throw new Error(
        'Missing SESSION_SECRET environment variable. Set it before starting the server.'
    );
}

// =====================================================
// VIEW ENGINE CONFIGURATION
// =====================================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// =====================================================
// BODY PARSER MIDDLEWARE
// =====================================================
app.use(express.json({ limit: '1mb' }));

app.use(
    express.urlencoded({
        extended: true,
        limit: '1mb'
    })
);

// =====================================================
// SECURITY HEADERS
// =====================================================
app.use(async (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');

    res.setHeader(
        'X-Frame-Options',
        'SAMEORIGIN'
    );

    res.setHeader(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
    );

    res.setHeader(
        'X-XSS-Protection',
        '0'
    );

    res.setHeader(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=()'
    );

    next();
});

// =====================================================
// STATIC FILES
// =====================================================
app.use(
    express.static(
        path.join(__dirname, 'public')
    )
);

app.use(
    '/uploads',
    express.static(
        path.join(__dirname, 'uploads')
    )
);

// =====================================================
// SESSION CONFIGURATION
// =====================================================
app.use(
    session({
        secret: sessionSecret,

        resave: false,

        saveUninitialized: false,

        store: new SupabaseSessionStore({
            ttl: 1000 * 60 * 60 * 24 * 7
        }),

        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7 Days
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production'
        }
    })
);

// =====================================================
// PASSPORT MIDDLEWARE
// =====================================================
app.use(passport.initialize());

app.use(passport.session());

// =====================================================
// GLOBAL LOCAL VARIABLES
// =====================================================
app.use(async (req, res, next) => {

    // -------------------------------------------------
    // Normalize User Name
    // -------------------------------------------------
    if (req.user) {
        req.user.name =
            req.user.name ||
            req.user.full_name ||
            req.user.displayName ||
            [
                req.user.firstName,
                req.user.lastName
            ]
                .filter(Boolean)
                .join(' ') ||
            req.user.email ||
            'ALVORA Client';

        req.user.avatar =
            req.user.avatar ||
            req.user.avatar_url ||
            '';
    }

    // -------------------------------------------------
    // Authentication Status


    // -------------------------------------------------
    // Authentication Status
    // -------------------------------------------------
    const isAuthenticated =
        req.isAuthenticated
            ? req.isAuthenticated()
            : false;

    const authenticatedUser =
        req.user || null;

    // -------------------------------------------------
    // Global User Variables
    // -------------------------------------------------
    res.locals.user = authenticatedUser;

    res.locals.currentUser =
        authenticatedUser;

    res.locals.isAuthenticated =
        isAuthenticated;

    res.locals.cartCount = 0;
    res.locals.wishlistCount = 0;

    // -------------------------------------------------
    // Admin Detection
    // -------------------------------------------------
    const isOgAdmin = !!authenticatedUser && authenticatedUser.email && authenticatedUser.email.toLowerCase() === 'ashwinvino8@gmail.com';
    
    res.locals.isOgAdmin = isOgAdmin;
    res.locals.isSubAdmin = isAuthenticated && !isOgAdmin;
    res.locals.isAdminMode = req.session && req.session.adminMode === true;

    // -------------------------------------------------
    // Current Page
    // -------------------------------------------------
    res.locals.currentPath =
        req.path;

    // -------------------------------------------------
    // Canonical URL
    // -------------------------------------------------
    res.locals.canonicalUrl =
        `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    // -------------------------------------------------
    // Default Open Graph Image
    // -------------------------------------------------
    res.locals.ogImage =
        res.locals.ogImage ||
        'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop';

    // -------------------------------------------------
    // Default Meta Description
    // -------------------------------------------------
    res.locals.metaDescription =
        res.locals.metaDescription ||
        'ALVORA luxury fashion house featuring quiet luxury essentials, tailored silhouettes, refined essentials, and elevated everyday statement pieces.';

    if (isAuthenticated && authenticatedUser?.id) {
        try {
            const [cartResult, wishlistResult] = await Promise.all([
                supabase
                    .from('cart')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', authenticatedUser.id),
                supabase
                    .from('favorites')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', authenticatedUser.id)
            ]);

            if (!cartResult.error) {
                res.locals.cartCount = cartResult.count || 0;
            }

            if (!wishlistResult.error) {
                res.locals.wishlistCount = wishlistResult.count || 0;
            }
        } catch (error) {
            console.error('Navigation count lookup failed:', error.message);
        }
    }

    next();
});

// =====================================================
// IMPORT ROUTES
// =====================================================
const authRoutes =
    require('./routes/authRoutes');

const productController =
    require('./controllers/productController');

const productRoutes =
    require('./routes/productRoutes');

const cartRoutes =
    require('./routes/cartRoutes');

const favoriteRoutes =
    require('./routes/favoriteRoutes');

const orderRoutes =
    require('./routes/orderRoutes');

const adminRoutes =
    require('./routes/adminRoutes');

const profileRoutes =
    require('./routes/profileRoutes');

// =====================================================
// MOUNT ROUTES
// =====================================================
app.use(
    '/auth',
    authRoutes
);

app.use(
    '/products',
    productRoutes
);

app.use(
    '/collection',
    productRoutes
);

app.use(
    '/cart',
    cartRoutes
);

app.use(
    '/wishlist',
    favoriteRoutes
);

app.use(
    '/orders',
    orderRoutes
);

app.use(
    '/admin',
    adminRoutes
);

app.use(
    '/profile',
    profileRoutes
);

// =====================================================
// HOME PAGE
// =====================================================
app.get('/', productController.getHomePage);

// =====================================================
// CATEGORY PAGE ALIASES KEPT FOR LEGACY UI LINKS
// =====================================================
app.get('/men', productController.getMenProducts);
app.get('/women', productController.getWomenProducts);
app.get('/kids', productController.getKidsProducts);
app.get('/footwear', productController.getFootwearProducts);

// =====================================================
// SEARCH PAGE ALIAS KEPT FOR LEGACY URL TARGETS
// =====================================================
app.get('/search', productController.searchProducts);

// =====================================================
// STATIC / SUPPORT PAGES THAT THE LAYOUT LINKS TARGET
// =====================================================
const staticPageMap = {
    '/about': {
        title: 'About ALVORA',
        description: 'Learn about ALVORA Maison, our design philosophy, atelier standards, and creative direction.'
    },
    '/craftsmanship': {
        title: 'Heritage & Craftsmanship',
        description: 'The ALVORA atelier is defined by measured tailoring, considered fabrication, and slow production.'
    },
    '/sustainability': {
        title: 'Sustainable Luxury',
        description: 'Our luxury sourcing and production model balances elevated design with responsible material stewardship.'
    },
    '/press': {
        title: 'Editorial & Press',
        description: 'Updates from the ALVORA Journal, house editorials, brand collaborations, and media coverage.'
    },
    '/careers': {
        title: 'Careers',
        description: 'Join the ALVORA Maison atelier, client services, and creative teams shaping the next season.'
    },
    '/terms': {
        title: 'Terms & Conditions',
        description: 'ALVORA terms for purchases, returns, shipping, and online client experience.'
    },
    '/privacy': {
        title: 'Privacy Policy',
        description: 'How ALVORA manages client information, Google authentication, and account privacy.'
    },
    '/cookies': {
        title: 'Cookie Preferences',
        description: 'Cookie usage, session experience, analytics choices, and personalisation settings.'
    },
    '/accessibility': {
        title: 'Accessibility Statement',
        description: 'ALVORA is committed to creating an inclusive and accessible digital shopping experience.'
    },
    '/returns': {
        title: 'Returns & Exchanges',
        description: 'ALVORA private client support details for returns, exchanges, and post-purchase care.'
    },
    '/shipping': {
        title: 'Shipping & Delivery',
        description: 'Complimentary express shipping, delivery windows, and global logistics support.'
    },
    '/care-guide': {
        title: 'Garment Care Guide',
        description: 'Care notes for maintaining ALVORA garments, styling, storage, and seasonal maintenance.'
    },
    '/contact': {
        title: 'Book an Appointment',
        description: 'Connect with the ALVORA atelier for styling appointments, wardrobe curation, and private viewing.'
    }
};

Object.entries(staticPageMap).forEach(([route, page]) => {
    app.get(route, (req, res) => {
        res.render('staticPage', {
            title: page.title,
            description: page.description
        });
    });
});

app.post('/subscribe', (req, res) => {
    const email = req.body && req.body.email;
    if (!email) {
        return res.redirect('back');
    }

    return res.redirect('/');
});

// =====================================================
// 404 PAGE
// =====================================================
app.use((req, res) => {

    res.status(404).render('404', {
        title:
            '404 - Page Not Found | ALVORA'
    });

});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================
app.use((err, req, res, next) => {

    console.error(
        'Unhandled Server Error:',
        err
    );

    res.status(
        err.status || 500
    ).render('error', {

        title:
            'Error | ALVORA',

        error:
            process.env.NODE_ENV === 'development'
                ? err
                : {}

    });

});

// =====================================================
// START SERVER
// =====================================================
const PORT =
    process.env.PORT || 3000;

if (require.main === module) {
    app.listen(
        PORT,
        () => {

            console.log(
                `ALVORA server successfully running on port ${PORT}`
            );

        }
    );
}

// =====================================================
// EXPORT APP
// =====================================================
module.exports = app;

