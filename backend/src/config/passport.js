import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { supabase } from './supabase.js';

passport.use(
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const { data: user, error } = await supabase
          .from('users')
          .select('id, name, email, password_hash')
          .eq('email', String(email).toLowerCase())
          .maybeSingle();

        if (error) return done(error);
        if (!user) return done(null, false, { message: 'Invalid email or password' });

        const matches = await bcrypt.compare(password, user.password_hash);
        if (!matches) return done(null, false, { message: 'Invalid email or password' });

        delete user.password_hash;
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Only the user id is stored in the session cookie; the rest is reloaded
// from the database on every request.
passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, created_at')
      .eq('id', id)
      .maybeSingle();

    if (error) return done(error);
    return done(null, user || false);
  } catch (err) {
    return done(err);
  }
});

export default passport;
