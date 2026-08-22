export interface AssetDto {
  id: string;
  filename: string;
  size: number;
  visibility: string;
  url: string;
  markdown: string;
}

export interface DocumentDto {
  id: string;
  filename: string;
  visibility: string;
  url: string;
  versionUrl: string;
  version: number;
}
