(() => {
  const seed = {
    users: [
      {
        id: 'owner-user-1',
        email: 'owner@rodando.com.br',
        password: '12345678',
      },
      {
        id: 'owner-user-2',
        email: 'outro@rodando.com.br',
        password: '12345678',
      },
    ],
    session: null,
    products: [
      {
        id: 'prod-1',
        owner_id: 'owner-user-1',
        codigo: 'CAM-AR18-FN',
        nome: 'Câmara de Ar',
        modelo: 'Aro 18 Fina',
        fabricante: 'Rodando',
        categoria: 'Câmara',
        preco: 49.9,
        estoque: 40,
        descricao: 'Aplicação 275-18 / 90/90-18 / 80/100-18 / 300-18',
        created_at: '2026-02-25T10:00:00.000Z',
        updated_at: '2026-02-25T10:00:00.000Z',
      },
      {
        id: 'prod-2',
        owner_id: 'owner-user-2',
        codigo: 'CAM-AR17-LG',
        nome: 'Câmara de Ar',
        modelo: 'Aro 17 Larga',
        fabricante: 'Rodando',
        categoria: 'Câmara',
        preco: 56.5,
        estoque: 20,
        descricao: 'Aplicação 110/80-17 / 120/90-17 / 130/70-17 / 350-17',
        created_at: '2026-02-25T10:00:00.000Z',
        updated_at: '2026-02-25T10:00:00.000Z',
      },
    ],
  };

  const listeners = [];

  function emitAuthEvent(eventName) {
    for (const cb of listeners) {
      cb(eventName, seed.session);
    }
  }

  function createError(message) {
    return { message };
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function makeSession(user) {
    return {
      access_token: 'mock-access-token',
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  function applyFilters(items, filters) {
    let result = [...items];

    for (const filter of filters) {
      if (filter.op === 'eq') {
        result = result.filter((row) => String(row[filter.column]) === String(filter.value));
      }
    }

    return result;
  }

  function queryBuilder(tableName) {
    const state = {
      op: null,
      filters: [],
      payload: null,
      orderBy: null,
    };

    const api = {
      select() {
        state.op = 'select';
        return api;
      },
      insert(payload) {
        if (!seed.session?.user) {
          return Promise.resolve({ data: null, error: createError('RLS: usuário não autenticado para insert.') });
        }

        const rows = Array.isArray(payload) ? payload : [payload];
        const inserted = rows.map((input) => {
          const row = {
            id: input.id || `prod-${Math.random().toString(36).slice(2, 11)}`,
            owner_id: seed.session.user.id,
            codigo: input.codigo,
            nome: input.nome,
            modelo: input.modelo,
            fabricante: input.fabricante || null,
            categoria: input.categoria || null,
            preco: Number(input.preco || 0),
            estoque: Number(input.estoque || 0),
            descricao: input.descricao || null,
            created_at: input.created_at || nowIso(),
            updated_at: input.updated_at || nowIso(),
          };
          seed.products.push(row);
          return row;
        });

        return Promise.resolve({ data: inserted, error: null });
      },
      update(payload) {
        state.op = 'update';
        state.payload = payload;
        return api;
      },
      delete() {
        state.op = 'delete';
        return api;
      },
      eq(column, value) {
        state.filters.push({ op: 'eq', column, value });

        if (state.op === 'select') {
          return api;
        }

        if (!seed.session?.user) {
          return Promise.resolve({ data: null, error: createError('RLS: usuário não autenticado.') });
        }

        if (state.op === 'update') {
          let updatedCount = 0;
          seed.products = seed.products.map((row) => {
            const match = state.filters.every((f) => String(row[f.column]) === String(f.value));
            if (!match) return row;
            if (row.owner_id !== seed.session.user.id) return row;
            updatedCount += 1;
            return { ...row, ...state.payload, owner_id: row.owner_id, updated_at: nowIso() };
          });

          if (!updatedCount) {
            return Promise.resolve({ data: null, error: createError('Nenhum registro atualizado (RLS ou filtro).') });
          }

          return Promise.resolve({ data: null, error: null });
        }

        if (state.op === 'delete') {
          const before = seed.products.length;
          seed.products = seed.products.filter((row) => {
            const match = state.filters.every((f) => String(row[f.column]) === String(f.value));
            if (!match) return true;
            return row.owner_id !== seed.session.user.id;
          });

          if (seed.products.length === before) {
            return Promise.resolve({ data: null, error: createError('Nenhum registro excluído (RLS ou filtro).') });
          }

          return Promise.resolve({ data: null, error: null });
        }

        return Promise.resolve({ data: null, error: null });
      },
      order(column, options = {}) {
        if (state.op !== 'select') {
          return Promise.resolve({ data: null, error: createError('Order só é suportado em select no mock.') });
        }

        const ascending = options.ascending !== false;
        let rows = applyFilters(seed.products, state.filters);

        rows.sort((a, b) => {
          const av = a[column] ?? '';
          const bv = b[column] ?? '';
          if (av === bv) return 0;
          return ascending ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
        });

        return Promise.resolve({ data: rows, error: null });
      },
    };

    return api;
  }

  window.supabase = {
    createClient() {
      return {
        auth: {
          async getSession() {
            return { data: { session: seed.session }, error: null };
          },
          onAuthStateChange(cb) {
            listeners.push(cb);
            return {
              data: {
                subscription: {
                  unsubscribe() {},
                },
              },
            };
          },
          async signInWithPassword({ email, password }) {
            const user = seed.users.find((u) => u.email === email && u.password === password);
            if (!user) {
              return { data: { user: null, session: null }, error: createError('Credenciais inválidas.') };
            }

            seed.session = makeSession(user);
            emitAuthEvent('SIGNED_IN');
            return { data: { user: seed.session.user, session: seed.session }, error: null };
          },
          async signUp({ email, password }) {
            if (seed.users.some((u) => u.email === email)) {
              return { data: { user: null, session: null }, error: createError('Usuário já cadastrado.') };
            }

            const newUser = {
              id: `owner-${Math.random().toString(36).slice(2, 10)}`,
              email,
              password,
            };
            seed.users.push(newUser);
            seed.session = makeSession(newUser);
            emitAuthEvent('SIGNED_IN');

            return {
              data: {
                user: seed.session.user,
                session: seed.session,
              },
              error: null,
            };
          },
          async signOut() {
            seed.session = null;
            emitAuthEvent('SIGNED_OUT');
            return { error: null };
          },
        },
        from(tableName) {
          return queryBuilder(tableName);
        },
      };
    },
  };
})();
