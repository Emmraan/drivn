import { useState, useCallback, useEffect } from 'react';
import { S3FileItem } from './useS3Files';

export interface S3SearchResult {
  files: S3FileItem[];
  hasMore: boolean;
  nextToken?: string;
  totalMatches: number;
}

export interface UseS3SearchOptions {
  debounceMs?: number;
  maxKeys?: number;
  includeMetadata?: boolean;
  minQueryLength?: number;
}

export function useS3Search(options: UseS3SearchOptions = {}) {
  const [results, setResults] = useState<S3FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [totalMatches, setTotalMatches] = useState(0);
  const [currentQuery, setCurrentQuery] = useState('');

  const {
    debounceMs = 300,
    maxKeys = 50,
    includeMetadata = false,
    minQueryLength = 2,
  } = options;

  const performSearch = useCallback(async (
    query: string,
    reset: boolean = true,
    token?: string
  ) => {
    if (!query || query.length < minQueryLength) {
      setResults([]);
      setHasMore(false);
      setTotalMatches(0);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: query,
        maxKeys: maxKeys.toString(),
        includeMetadata: includeMetadata.toString(),
      });

      if (token) {
        params.append('continuationToken', token);
      }

      const response = await fetch(`/api/s3-search?${params}`);
      const result = await response.json();

      if (result.success) {
        if (reset) {
          setResults(result.data.files || []);
        } else {
          setResults(prev => [...prev, ...(result.data.files || [])]);
        }
        setHasMore(result.data.hasMore || false);
        setNextToken(result.data.nextToken);
        setTotalMatches(result.data.totalResults || 0);
      } else {
        setError(result.message || 'Search failed');
        if (reset) {
          setResults([]);
          setHasMore(false);
          setTotalMatches(0);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      if (reset) {
        setResults([]);
        setHasMore(false);
        setTotalMatches(0);
      }
    } finally {
      setLoading(false);
    }
  }, [maxKeys, includeMetadata, minQueryLength]);

  const search = useCallback((query: string) => {
    setCurrentQuery(query);
    setNextToken(undefined);
    performSearch(query, true);
  }, [performSearch]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading && nextToken && currentQuery) {
      performSearch(currentQuery, false, nextToken);
    }
  }, [hasMore, loading, nextToken, currentQuery, performSearch]);

  const clearResults = useCallback(() => {
    setResults([]);
    setHasMore(false);
    setTotalMatches(0);
    setError(null);
    setCurrentQuery('');
    setNextToken(undefined);
  }, []);

  useEffect(() => {
    if (!currentQuery) {
      clearResults();
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch(currentQuery, true);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [currentQuery, debounceMs, performSearch, clearResults]);

  return {
    results,
    loading,
    error,
    hasMore,
    totalMatches,
    currentQuery,
    search,
    loadMore,
    clearResults,
  };
}
