const GoogleStrategy = require('passport-google-oauth20').Strategy;
const supabase = require('./supabase');

module.exports = function (passport) {

    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                state: true,
                callbackURL:
                    process.env.GOOGLE_CALLBACK_URL ||
                    'http://localhost:3000/auth/google/callback'
            },

            async (accessToken, refreshToken, profile, done) => {
                try {
                    const email =
                        profile.emails?.[0]?.value?.toLowerCase() || '';

                    const fullName =
                        profile.displayName || 'ALVORA Client';

                    const avatarUrl =
                        profile.photos?.[0]?.value || '';

                    if (!email) {
                        return done(
                            new Error('Google account did not provide an email'),
                            null
                        );
                    }

                    // Check whether profile already exists
                    const { data: matches, error: lookupError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('email', email)
                        .order('created_at', { ascending: true })
                        .limit(1);

                    let user = matches && matches[0];
                    let error = lookupError;

                    if (error) {
                        console.error(
                            'Supabase profile lookup failed:',
                            error.message
                        );
                        return done(error, null);
                    }

                    // Create profile if it does not exist
                    if (!user) {
                        const result = await supabase
                            .from('profiles')
                            .insert({
                                full_name: fullName,
                                email,
                                avatar_url: avatarUrl
                            })
                            .select()
                            .single();

                        user = result.data;
                        error = result.error;

                        if (error) {
                            console.error(
                                'Supabase profile creation failed:',
                                error.message
                            );
                            return done(error, null);
                        }
                    }

                    return done(null, user);

                } catch (error) {
                    console.error(
                        'Passport Google Strategy Error:',
                        error
                    );

                    return done(error, null);
                }
            }
        )
    );

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const { data: user, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (error) {
                return done(error, null);
            }

            if (!user) {
                return done(null, false);
            }

            return done(null, user);

        } catch (error) {
            return done(error, null);
        }
    });
};
