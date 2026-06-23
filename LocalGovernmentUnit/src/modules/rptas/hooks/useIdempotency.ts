import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export const useIdempotency = () => {
  const [key, setKey] = useState<string>(uuidv4());

  const refreshKey = useCallback(() => {
    const newKey = uuidv4();
    setKey(newKey);
    return newKey;
  }, []);

  const getKey = useCallback(() => {
    return key;
  }, [key]);

  return { idempotencyKey: key, refreshKey, getKey };
};
