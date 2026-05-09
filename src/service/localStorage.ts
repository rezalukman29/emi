type LanguageKeyType = 'i18nextLng';

interface GetLocalStorageInterface {
  key: LanguageKeyType;
}
interface SetLocalStorageInterface extends GetLocalStorageInterface {
  value?: string;
}

export const localStorageService = (() => {
  let _service: unknown;

  function _getService(this: {
    getService: () => unknown;
    getCart: (key: 'cart') => string | null;
    clearCart: (key: 'cart') => void;
    getAuth: (key: 'auth') => string | null;
    clearAuth: (key: 'auth') => void;
  }) {
    if (!_service) {
      _service = this;
      return _service;
    }
    return _service;
  }
  function _setItem({ key, value }: { key: string; value: string }) {
    localStorage.setItem(key, value);
  }


  function _getCart(key: 'cart') {
    if (typeof window !== 'undefined') {
      return localStorage?.getItem(key);
    }
  }
  function _clearCart(key: 'cart') {
    localStorage.removeItem(key);
  }
  function _getAuth(key: 'auth') {
    if (typeof window !== 'undefined') {
      return localStorage?.getItem(key);
    }
  }
  function _clearAuth(key: 'auth') {
    localStorage.removeItem(key);
  }
  return {
    getService: _getService,
    setCart: _setItem,
    setAuth: _setItem,
    getCart: _getCart,
    clearCart: _clearCart,
    getAuth: _getAuth,
    clearAuth: _clearAuth,
  };
})();
