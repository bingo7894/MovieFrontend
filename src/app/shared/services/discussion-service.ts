import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class DiscussionService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getEpisodeDiscussions(episodeId: number | string) {
    return this.http.get(`${this.apiUrl}/episodes/${episodeId}/discussions`);
  }

  createDiscussion(
    episodeId: number | string,
    data: { title: string; content: string; videoTimestamp: number },
  ) {
    return this.http.post(`${this.apiUrl}/episodes/${episodeId}/discussions`, data);
  }

  addReply(discussionId: number | string, content: string) {
    return this.http.post(`${this.apiUrl}/discussions/${discussionId}/replies`, { content });
  }

  toggleResolved(discussionId: number | string) {
    return this.http.patch(`${this.apiUrl}/discussions/${discussionId}/resolve`, {});
  }

  togglePinned(discussionId: number | string) {
    return this.http.patch(`${this.apiUrl}/discussions/${discussionId}/pin`, {});
  }

  deleteDiscussion(discussionId: number | string) {
    return this.http.delete(`${this.apiUrl}/discussions/${discussionId}`);
  }
}
