export type Point = {date:string;tvl:number};
export type Metrics = {change1d:number|null;change7d:number|null;change30d:number|null;change180d:number|null;absolute1d:number|null;absolute7d:number|null;absolute30d:number|null;absolute180d:number|null};
export type Row = Metrics & {eligible?:boolean;slug:string;name:string;tvl:number;rank:number;share:number|null;rankChange?:number|null;shareChange1d?:number|null;historyPath:string;chain?:string;category?:string;globalTvl?:number|null;top30Tvl?:number;protocolGap?:number;protocolCount?:number};
export type Summary = {version:number;updatedAt:string;snapshotDate:string;globalAsOf:string;globalTvl:number;totalChainTvl:number;top10Tvl:number;chainCount:number;protocolCount:number;largestChain:string;metrics:Metrics;top10Members:string[];globalChainDifference:number};
export type Insight = {title:string;name:string;value:number;tvl:number;kind:string;url:string};
export type Status = {status:string;lastSuccess:string|null;warnings:string[];errors:string[];attemptedAt:string|null};
