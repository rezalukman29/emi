import { useMemo } from 'react';
import useGetUsers, { type UserListItem } from '../../hooks/api/useGetUsers';
import type { SearchableSelectOption } from '../SearchableSelect';

// Users that tasks can be assigned to, and the admins that get the "task ticked" e-mail.
// Reuses the existing user list API (GET /v1/get-all-user) — no new endpoint.

export function useChecklistUsers() {
  const query = useGetUsers({
    params: { page: 1, limit: 200, search: '', sort_dir: 'asc', sort_by: 'fullname' },
    options: { staleTime: 5 * 60_000 },
  });
  const users = useMemo<UserListItem[]>(() => query.data?.data?.users ?? [], [query.data]);
  const options = useMemo<SearchableSelectOption[]>(
    () => users.map((user) => ({ value: user.id, label: user.fullname || user.username, meta: user.email })),
    [users],
  );
  const admins = useMemo(
    () => users.filter((user) => user.is_admin === 1 || user.user_type?.toUpperCase() === 'ADMIN'),
    [users],
  );
  const nameOf = (id: number) => {
    const user = users.find((entry) => entry.id === id);
    return user ? user.fullname || user.username : null;
  };
  return { users, options, admins, nameOf, isLoading: query.isLoading, isError: query.isError };
}
