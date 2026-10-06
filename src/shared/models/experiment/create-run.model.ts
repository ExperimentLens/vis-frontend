export interface ICreateRunRequest {
  experimentId: string;
  runName: string;
  params: Record<string, string>;
}

export interface ICreateRunResponse {
  message: string;
  kfpRunId: string;
  runName: string;
}
