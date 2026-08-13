const session = require('express-session');
const supabase = require('./supabase');

class SupabaseSessionStore extends session.Store {
  constructor(options = {}) {
    super();
    this.ttl = options.ttl || 1000 * 60 * 60 * 24 * 7;
  }

  getExpiry(sessionData) {
    if (sessionData && sessionData.cookie && sessionData.cookie.expires) {
      return new Date(sessionData.cookie.expires).toISOString();
    }

    return new Date(Date.now() + this.ttl).toISOString();
  }

  async get(sid, callback) {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('session_data, expires_at')
        .eq('sid', sid)
        .maybeSingle();

      if (error) {
        return callback(error);
      }

      if (!data) {
        return callback(null, null);
      }

      if (new Date(data.expires_at).getTime() <= Date.now()) {
        const { error: deleteError } = await supabase
          .from('sessions')
          .delete()
          .eq('sid', sid);

        if (deleteError) {
          return callback(deleteError);
        }

        return callback(null, null);
      }

      const sessionData = data.session_data;
      if (sessionData && sessionData.cookie && sessionData.cookie.expires) {
        sessionData.cookie.expires = new Date(sessionData.cookie.expires);
      }

      return callback(null, sessionData);
    } catch (error) {
      return callback(error);
    }
  }

  async set(sid, sessionData, callback = () => {}) {
    try {
      const { error } = await supabase
        .from('sessions')
        .upsert(
          {
            sid,
            session_data: sessionData,
            expires_at: this.getExpiry(sessionData)
          },
          { onConflict: 'sid' }
        );

      return callback(error || null);
    } catch (error) {
      return callback(error);
    }
  }

  async touch(sid, sessionData, callback = () => {}) {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ expires_at: this.getExpiry(sessionData) })
        .eq('sid', sid);

      return callback(error || null);
    } catch (error) {
      return callback(error);
    }
  }

  async destroy(sid, callback = () => {}) {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('sid', sid);

      return callback(error || null);
    } catch (error) {
      return callback(error);
    }
  }
}

module.exports = SupabaseSessionStore;
