import { useState, useCallback } from "react";
import Papa from "papaparse";
import type { TradeRecord } from "@/lib/tradeData";

export function useCsvParser() {
  const [isLoading, setIsLoading] = useState(false);

  const parseFile = useCallback((file: File): Promise<TradeRecord[]> => {
    return new Promise((resolve, reject) => {
      setIsLoading(true);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          setIsLoading(false);
          const records = results.data as TradeRecord[];
          // Validate required fields
          const valid = records.filter(
            r => r.Country && r.Product && typeof r.Export_Value === "number"
          );
          resolve(valid);
        },
        error: (error) => {
          setIsLoading(false);
          reject(error);
        },
      });
    });
  }, []);

  return { parseFile, isLoading };
}
