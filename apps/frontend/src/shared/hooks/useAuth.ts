import { useMutation } from '@tanstack/react-query';
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

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ data }) => {
      setAuth(data.user, data.accessToken);
      const role = data.user.role;
      navigate(role === 'MASTER' ? '/master/dashboard' : '/client/dashboard');
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      logout();
      navigate('/');
    },
  });
}
