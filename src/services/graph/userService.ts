import { GraphClient } from './graphClient';

export class UserService {
  private readonly graph: GraphClient;
  constructor(graph: GraphClient) {
    this.graph = graph;
  }

  async getCurrentUser(): Promise<{ displayName: string; mail: string; id: string }> {
    return this.graph.request('/me');
  }
}


