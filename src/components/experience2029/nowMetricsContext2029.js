import { createContext } from "react";

// Default null = no metrics source connected = the Now window shows no metrics area at all.
// Value shape (contract-agnostic): { Panel: ReactComponent } supplied by the owner of the metrics contract.
export const NowMetricsContext2029 = createContext(null);
