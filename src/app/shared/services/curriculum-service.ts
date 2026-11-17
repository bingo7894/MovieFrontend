import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class CurriculumService {
  private adminUrl = environment.apiUrl + '/admin';

  constructor(private http: HttpClient) {}

  createTopic(courseId: number | string, data: any) {
    return this.http.post(`${this.adminUrl}/courses/${courseId}/topics`, data);
  }

  updateTopic(topicId: number | string, data: any) {
    return this.http.put(`${this.adminUrl}/topics/${topicId}`, data);
  }

  deleteTopic(topicId: number | string) {
    return this.http.delete(`${this.adminUrl}/topics/${topicId}`);
  }

  reorderTopics(courseId: number | string, orderedIds: number[]) {
    return this.http.patch(`${this.adminUrl}/courses/${courseId}/topics/reorder`, { orderedIds });
  }

  createEpisode(topicId: number | string, data: any) {
    return this.http.post(`${this.adminUrl}/topics/${topicId}/episodes`, data);
  }

  updateEpisode(episodeId: number | string, data: any) {
    return this.http.put(`${this.adminUrl}/episodes/${episodeId}`, data);
  }

  deleteEpisode(episodeId: number | string) {
    return this.http.delete(`${this.adminUrl}/episodes/${episodeId}`);
  }

  reorderEpisodes(topicId: number | string, orderedIds: number[]) {
    return this.http.patch(`${this.adminUrl}/topics/${topicId}/episodes/reorder`, { orderedIds });
  }

  addAttachment(episodeId: number | string, data: any) {
    return this.http.post(`${this.adminUrl}/episodes/${episodeId}/attachments`, data);
  }

  deleteAttachment(attachmentId: number | string) {
    return this.http.delete(`${this.adminUrl}/attachments/${attachmentId}`);
  }
}
