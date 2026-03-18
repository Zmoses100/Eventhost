const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
const AUTH_STORAGE_KEY = 'eventhost.auth.session';

const channelMap = new Map();

const safeJsonParse = (raw, fallback = null) => {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const getStoredSession = () => safeJsonParse(localStorage.getItem(AUTH_STORAGE_KEY), null);

const setStoredSession = (session) => {
  if (session) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

const toDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const apiRequest = async (path, options = {}) => {
  const session = getStoredSession();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const body = await response.json().catch(() => ({ data: null, error: { message: 'Invalid JSON response.' } }));
  if (!response.ok) {
    return { data: null, error: body.error || { message: 'Request failed.' } };
  }

  return { data: body.data ?? null, error: body.error ?? null, count: body.count ?? null };
};

class QueryBuilder {
  constructor(table, action = 'select', payload = null) {
    this.table = table;
    this.action = action;
    this.payload = payload;
    this.filters = [];
    this.orderBy = null;
    this.limitValue = null;
    this.rangeValue = null;
    this.selectOptions = {};
    this.singleMode = false;
    this.maybeSingleMode = false;
  }

  select(_columns = '*', options = {}) {
    this.action = this.action === 'insert' || this.action === 'upsert' || this.action === 'update' ? this.action : 'select';
    this.selectOptions = { ...this.selectOptions, ...options };
    return this;
  }

  insert(values) {
    this.action = 'insert';
    this.payload = values;
    return this;
  }

  update(values) {
    this.action = 'update';
    this.payload = values;
    return this;
  }

  delete() {
    this.action = 'delete';
    this.payload = null;
    return this;
  }

  upsert(values) {
    this.action = 'upsert';
    this.payload = values;
    return this;
  }

  eq(column, value) {
    this.filters.push({ op: 'eq', column, value });
    return this;
  }

  neq(column, value) {
    this.filters.push({ op: 'neq', column, value });
    return this;
  }

  in(column, value) {
    this.filters.push({ op: 'in', column, value });
    return this;
  }

  ilike(column, value) {
    this.filters.push({ op: 'ilike', column, value });
    return this;
  }

  match(value) {
    this.filters.push({ op: 'match', column: '*', value });
    return this;
  }

  or(value) {
    this.filters.push({ op: 'or', column: '*', value });
    return this;
  }

  order(column, { ascending = true } = {}) {
    this.orderBy = { column, ascending };
    return this;
  }

  limit(value) {
    this.limitValue = value;
    return this;
  }

  range(from, to) {
    this.rangeValue = [from, to];
    return this;
  }

  single() {
    this.singleMode = true;
    return this;
  }

  maybeSingle() {
    this.maybeSingleMode = true;
    return this;
  }

  async execute() {
    return apiRequest('/api/query', {
      method: 'POST',
      body: JSON.stringify({
        table: this.table,
        action: this.action,
        values: this.payload,
        filters: this.filters,
        orderBy: this.orderBy,
        limit: this.limitValue,
        range: this.rangeValue,
        selectOptions: this.selectOptions,
        single: this.singleMode,
        maybeSingle: this.maybeSingleMode,
      }),
    });
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}

const authListeners = new Set();
const notifyAuthListeners = (event, session) => {
  authListeners.forEach((listener) => listener(event, session));
};

const auth = {
  async getSession() {
    const localSession = getStoredSession();
    if (!localSession?.access_token) {
      return { data: { session: null }, error: null };
    }

    const { data, error } = await apiRequest('/api/auth/session');
    if (error) {
      setStoredSession(null);
      return { data: { session: null }, error: null };
    }

    setStoredSession(data.session);
    return { data: { session: data.session }, error: null };
  },

  onAuthStateChange(callback) {
    authListeners.add(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => authListeners.delete(callback),
        },
      },
    };
  },

  async signUp({ email, password, options }) {
    const { data, error } = await apiRequest('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, options }),
    });

    if (error) return { data: null, error };
    setStoredSession(data.session);
    notifyAuthListeners('SIGNED_IN', data.session);
    return { data, error: null };
  },

  async signInWithPassword({ email, password }) {
    const { data, error } = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (error) return { data: null, error };
    setStoredSession(data.session);
    notifyAuthListeners('SIGNED_IN', data.session);
    return { data, error: null };
  },

  async signOut() {
    await apiRequest('/api/auth/signout', { method: 'POST' });
    setStoredSession(null);
    notifyAuthListeners('SIGNED_OUT', null);
    return { error: null };
  },

  async updateUser({ password }) {
    const { data, error } = await apiRequest('/api/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    return { data, error };
  },

  async signInWithOtp({ email }) {
    const { data, error } = await apiRequest('/api/auth/signin-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    if (error) return { data: null, error };
    setStoredSession(data.session);
    notifyAuthListeners('SIGNED_IN', data.session);
    return { data, error: null };
  },

  async resetPasswordForEmail(email) {
    return apiRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
};

const storage = {
  from(bucket) {
    return {
      async upload(filePath, file) {
        try {
          const dataUrl = await toDataUrl(file);
          const { data, error } = await apiRequest('/api/storage/upload', {
            method: 'POST',
            body: JSON.stringify({
              bucket,
              path: filePath,
              fileName: file.name,
              contentType: file.type,
              content: dataUrl,
            }),
          });
          return { data, error };
        } catch (error) {
          return { data: null, error: { message: error.message } };
        }
      },

      getPublicUrl(filePath) {
        const normalizedBase = API_BASE.replace(/\/api$/, '');
        return {
          data: {
            publicUrl: `${normalizedBase}/uploads/${bucket}/${filePath}`,
          },
        };
      },
    };
  },
};

const functions = {
  async invoke(name, { body } = {}) {
    return apiRequest(`/api/functions/${name}`, {
      method: 'POST',
      body: JSON.stringify(body || {}),
    });
  },
};

class LocalChannel {
  constructor(name) {
    this.name = name;
    this.handlers = [];
    this.subscribed = false;
  }

  on(eventType, filterOrCallback, maybeCallback) {
    let callback = maybeCallback;
    let filter = null;

    if (typeof filterOrCallback === 'function') {
      callback = filterOrCallback;
    } else {
      filter = filterOrCallback;
    }

    this.handlers.push({ eventType, filter, callback });
    return this;
  }

  async subscribe(statusCallback) {
    this.subscribed = true;
    if (!channelMap.has(this.name)) {
      channelMap.set(this.name, []);
    }
    channelMap.get(this.name).push(this);
    statusCallback?.('SUBSCRIBED');
    return this;
  }

  async send(payload) {
    const listeners = channelMap.get(this.name) || [];
    listeners.forEach((listener) => {
      listener.handlers.forEach((handler) => {
        if (handler.eventType === 'broadcast' && payload.type === handler.filter?.event) {
          handler.callback({ event: payload.type, payload: payload.payload });
        }
        if (handler.eventType === 'postgres_changes') {
          handler.callback({ new: payload.payload, old: null, eventType: 'UPDATE' });
        }
      });
    });
    return { error: null };
  }

  unsubscribe() {
    const listeners = channelMap.get(this.name) || [];
    channelMap.set(this.name, listeners.filter((listener) => listener !== this));
    this.subscribed = false;
  }
}

const channel = (name) => new LocalChannel(name);

const removeChannel = (instance) => {
  instance?.unsubscribe();
};

const rpc = async (name, args = {}) => apiRequest(`/api/rpc/${name}`, {
  method: 'POST',
  body: JSON.stringify(args),
});

const from = (table) => new QueryBuilder(table);

export const supabase = {
  auth,
  from,
  storage,
  rpc,
  functions,
  channel,
  removeChannel,
};

export default supabase;
export const customSupabaseClient = supabase;
