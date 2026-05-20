import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { authApi } from '../api/endpoints';

export function useAuth() {
  const { user, accessToken, setAuth, setAccessToken, logout, isAuthenticated } = useAuthStore();
  return { user, accessToken, setAuth, setAccessToken, logout, isAuthenticated };
}


export function useLogin() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ data }) => {
      queryClient.clear();
      setAuth(data.user, data.accessToken);
      const role = data.user.role;
      if (role === 'MASTER') navigate('/master/dashboard');
      else if (role === 'ADMIN') navigate('/admin/dashboard');
      else navigate('/client/dashboard');
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      queryClient.clear();
      logout();
      navigate('/');
    },
  });
}
