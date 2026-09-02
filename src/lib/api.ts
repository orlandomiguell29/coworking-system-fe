const API_URL = import.meta.env.VITE_API_URL;

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  full_name: string;
}

interface AuthResponse {
  user: {
    email: string;
    full_name?: string;
  };
  access_token: string;
  token_type: string;
}

interface ErrorResponse {
  message: string;
  statusCode?: number;
}

//spaces
interface Space {
  id: string;
  name: string;
  description: string;
  capacity: number;
  price_per_hour: number;
  is_active: boolean;
  location: string;
  address: string;
  city: string;
  amenities: string[];
  image_url?: string;
}

interface BookingData {
  space_id: string;
  start_time: string;
  end_time: string;
  total_price: number;
  status: string;
}

interface BookingUpdateData {
  space_id: string;
  start_time?: string;
  end_time?: string;
  total_price?: number;
  status?: string;
}

// Dashboard interfaces
interface SpaceStats {
  name: string;
  bookings: number;
}

interface HourlyStats {
  hour: number;
  bookings: number;
}

interface StatusStats {
  status: string;
  count: number;
}

interface DashboardMetrics {
  totalBookings: number;
  activeSpaces: number;
  averageBookingDuration: number;
  occupancyRate: number;
}

// Token management
let authToken: string | null = null;

const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
};

const getAuthToken = (): string | null => {
  if (!authToken) {
    authToken = localStorage.getItem('auth_token');
  }
  return authToken;
};

const getHeaders = (includeAuth: boolean = true): HeadersInit => {
  const headers: HeadersInit = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
};

// Error handler helper
const handleApiError = async (response: Response): Promise<ErrorResponse> => {
  try {
    const errorData = await response.json();
    return {
      message: response.status === 401
        ? "Credenciales inválidas. Verifica tu correo y contraseña."
        : errorData.message || "Error en la operación",
      statusCode: response.status
    };
  } catch (e) {
    return {
      message: response.status === 405
        ? "Método no permitido. Por favor, contacta al soporte técnico."
        : "Error de conexión con el servidor",
      statusCode: response.status
    };
  }
};

// API client with improved error handling
export const api = {
  baseUrl: API_URL,
  getHeaders,
  auth: {
    login: async (credentials: LoginCredentials) => {
      try {
        const url = new URL(`${API_URL}/auth/login`);
        url.searchParams.append('email', credentials.email);
        url.searchParams.append('password', credentials.password);

        const response = await fetch(url.toString(), {
          method: 'POST',
          headers: getHeaders(false),
          mode: 'cors',
        });
        if (!response.ok) {
          const error = await handleApiError(response);
          throw new Error(error.message);
        }
        
        const data: AuthResponse = await response.json();

        return data;
      } catch (error) {
        console.error('Login error:', error);
        if (error instanceof Error) {
          throw new Error(error.message);
        }
        throw new Error('Error al intentar iniciar sesión');
      }
    },

    register: async (data: RegisterData) => {
      try {
        const response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: getHeaders(false),
          mode: 'cors',
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          const error = await handleApiError(response);
          if (response.status === 409) {
            throw new Error('Este correo electrónico ya está registrado');
          }
          throw new Error(error.message);
        }
        
        const authData: AuthResponse = await response.json();
        setAuthToken(authData.access_token);
        return authData;
      } catch (error) {
        console.error('Register error:', error);
        if (error instanceof Error) {
          throw new Error(error.message);
        }
        throw new Error('Error al intentar registrarse');
      }
    },

    logout: async () => {
      try {
        const response = await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: getHeaders(),
          mode: 'cors',
        });
        
        if (!response.ok) {
          const error = await handleApiError(response);
          throw new Error(error.message);
        }
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        setAuthToken(null);
      }
    },

    getSession: async () => {
      const token = getAuthToken();
      if (!token) return null;

      try {
        const response = await fetch(`${API_URL}/auth/session`, {
          method: 'GET',
          headers: getHeaders(),
          mode: 'cors',
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            setAuthToken(null);
          }
          return null;
        }
        
        return response.json();
      } catch (error) {
        console.error('Session error:', error);
        setAuthToken(null);
        return null;
      }
    },
  },
  spaces: {
    getAll: async (): Promise<Space[]> => {
      try {
        const response = await fetch(`${API_URL}/spaces`, {
          method: 'GET',
          headers: getHeaders(),
          mode: 'cors',
        });

        if (!response.ok) {
          const error = await handleApiError(response);
          throw new Error(error.message);
        }

        return response.json();
      } catch (error) {
        console.error('Error fetching spaces:', error);
        throw error;
      }
    },

    checkAvailability: async (spaceId: string, startTime: string, endTime: string): Promise<boolean> => {
      try {
        const url = new URL(`${API_URL}/spaces/${spaceId}/availability`);
        url.searchParams.append('start_time', startTime);
        url.searchParams.append('end_time', endTime);

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: getHeaders(),
          mode: 'cors',
        });

        if (!response.ok) {
          const error = await handleApiError(response);
          throw new Error(error.message);
        }

        const { available } = await response.json();
        return available;
      } catch (error) {
        console.error('Error checking availability:', error);
        throw error;
      }
    }
  },
  bookings: {
    create: async (booking: BookingData) => {
      try {
        const response = await fetch(`${API_URL}/bookings`, {
          method: 'POST',
          headers: getHeaders(),
          mode: 'cors',
          body: JSON.stringify(booking)
        });

        if (!response.ok) {
          const error = await handleApiError(response);
          throw new Error(error.message);
        }

        return response.json();
      } catch (error) {
        console.error('Error creating booking:', error);
        throw error;
      }
    },

    getAll: async () => {
      try {
        const response = await fetch(`${API_URL}/bookings`, {
          method: 'GET',
          headers: getHeaders(),
          mode: 'cors',
        });

        if (!response.ok) {
          const error = await handleApiError(response);
          throw new Error(error.message);
        }

        return response.json();
      } catch (error) {
        console.error('Error fetching bookings:', error);
        throw error;
      }
    },

    update: async (id: string, data: Partial<BookingUpdateData> & { status?: string }) => {
      try {
        const response = await fetch(`${API_URL}/bookings/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          mode: 'cors',
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          const error = await handleApiError(response);
          throw new Error(error.message);
        }

        return response.json();
      } catch (error) {
        console.error('Error updating booking:', error);
        throw error;
      }
    },

    delete: async (id: string) => {
      try {
        const response = await fetch(`${API_URL}/bookings/${id}`, {
          method: 'DELETE',
          headers: getHeaders(),
          mode: 'cors',
        });

        if (!response.ok) {
          const error = await handleApiError(response);
          throw new Error(error.message);
        }
      } catch (error) {
        console.error('Error deleting booking:', error);
        throw error;
      }
    }
  },
  dashboard: {
    getSpaceStats: async (): Promise<SpaceStats[]> => {
      try {
        const response = await fetch(`${API_URL}/dashboard/space-stats`, {
          headers: getHeaders(),
          mode: 'cors'
        });

        if (!response.ok) {
          const error = await handleApiError(response);
          throw new Error(error.message);
        }

        return response.json();
      } catch (error) {
        console.error('Error fetching space stats:', error);
        throw error;
      }
    },

    getHourlyStats: async (): Promise<HourlyStats[]> => {
      try {
        const response = await fetch(`${API_URL}/dashboard/hourly-stats`, {
          headers: getHeaders(),
          mode: 'cors'
        });

        if (!response.ok) {
          const error = await handleApiError(response);
          throw new Error(error.message);
        }

        return response.json();
      } catch (error) {
        console.error('Error fetching hourly stats:', error);
        throw error;
      }
    },

    getStatusStats: async (): Promise<StatusStats[]> => {
      try {
        const response = await fetch(`${API_URL}/dashboard/status-stats`, {
          headers: getHeaders(),
          mode: 'cors'
        });

        if (!response.ok) {
          const error = await handleApiError(response);
          throw new Error(error.message);
        }

        return response.json();
      } catch (error) {
        console.error('Error fetching status stats:', error);
        throw error;
      }
    },

    getMetrics: async (): Promise<DashboardMetrics> => {
      try {
        const response = await fetch(`${API_URL}/dashboard/metrics`, {
          headers: getHeaders(),
          mode: 'cors'
        });

        if (!response.ok) {
          const error = await handleApiError(response);
          throw new Error(error.message);
        }

        return response.json();
      } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
        throw error;
      }
    }
  }
};
