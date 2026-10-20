import bcrypt from 'bcrypt';
import passport from 'passport';
import { supabase } from '../config/supabase.js';
import { config } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, created_at: u.created_at });

// POST /auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ error: 'That email is already registered' });
  }

  const password_hash = await bcrypt.hash(password, config.bcryptRounds);

  const { data: user, error } = await supabase
    .from('users')
    .insert({ name, email, password_hash })
    .select('id, name, email, created_at')
    .single();

  if (error) throw error;

  // Log the new user straight in.
  return req.login(user, (err) => {
    if (err) throw err;
    return res.status(201).json({ user: publicUser(user) });
  });
});

// POST /auth/login
export const login = (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info?.message || 'Invalid credentials' });

    return req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      return res.json({ user: publicUser(user) });
    });
  })(req, res, next);
};

// POST /auth/logout
export const logout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('ttm.sid');
      return res.json({ message: 'Logged out' });
    });
  });
};

// GET /auth/me
export const me = (req, res) => {
  res.json({ user: publicUser(req.user) });
};
