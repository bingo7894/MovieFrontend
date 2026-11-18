import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { CourseService } from '../../shared/services/course-service';
import { CurriculumService } from '../../shared/services/curriculum-service';
import { QuizService } from '../../shared/services/quiz-service';
import { MediaService } from '../../shared/services/media-service';
import { DialogService } from '../../shared/services/dialog-service';
import { NotificationService } from '../../shared/services/notification-service';
import { UtilityService } from '../../shared/services/utility-service';
import { ErrorHandlerService } from '../../shared/services/error-handler-service';

@Component({
  selector: 'app-course-curriculum',
  standalone: false,
  templateUrl: './course-curriculum.html',
  styleUrl: './course-curriculum.css',
})
export class CourseCurriculum implements OnInit {
  courseId!: number;
  course: any = null;
  loading = true;
  refreshing = false;
  uploadingEpisodeId: number | null = null;
  uploadProgress = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    private curriculumService: CurriculumService,
    private quizService: QuizService,
    private mediaService: MediaService,
    private dialogService: DialogService,
    private notification: NotificationService,
    public utilityService: UtilityService,
    private errorHandler: ErrorHandlerService,
  ) {}

  ngOnInit(): void {
    this.courseId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadCourse();
  }

  loadCourse(): void {
    if (!this.course) {
      this.loading = true;
    } else {
      this.refreshing = true;
    }

    this.courseService
      .getAdminCourseDetail(this.courseId)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.refreshing = false;
        }),
      )
      .subscribe({
        next: (course) => {
          this.course = course;
        },
        error: (err) => {
          this.errorHandler.handle(err, 'Failed to load course curriculum');
        },
      });
  }

  backToCourses(): void {
    this.router.navigate(['/admin/courses']);
  }

  addTopic(): void {
    const nextOrder = (this.course?.topics?.length || 0) + 1;
    this.dialogService
      .openTopicFormDialog('create', this.courseId, undefined, nextOrder)
      .afterClosed()
      .subscribe((res) => {
        if (res) this.loadCourse();
      });
  }

  editTopic(topic: any): void {
    this.dialogService
      .openTopicFormDialog('edit', this.courseId, topic)
      .afterClosed()
      .subscribe((res) => {
        if (res) this.loadCourse();
      });
  }

  deleteTopic(topic: any): void {
    this.dialogService
      .openConfirmation(
        'Delete Topic?',
        `Delete "${topic.title}" and all its EPs, attachments, and quizzes?`,
        'Delete',
        'Cancel',
        'danger',
      )
      .subscribe((ok) => {
        if (!ok) return;
        this.curriculumService.deleteTopic(topic.id).subscribe({
          next: () => {
            this.notification.success('Topic deleted');
            this.loadCourse();
          },
          error: (err) => this.errorHandler.handle(err, 'Failed to delete topic'),
        });
      });
  }

  moveTopic(index: number, delta: number): void {
    const topics = [...this.course.topics];
    const target = index + delta;
    if (target < 0 || target >= topics.length) return;
    [topics[index], topics[target]] = [topics[target], topics[index]];
    this.course.topics = topics;
    const orderedIds = topics.map((t: any) => t.id);
    this.curriculumService.reorderTopics(this.courseId, orderedIds).subscribe({
      next: () => this.loadCourse(),
      error: (err) => {
        this.loadCourse();
        this.errorHandler.handle(err, 'Failed to reorder topics');
      },
    });
  }

  addEpisode(topic: any): void {
    const nextEp = (topic.episodes?.length || 0) + 1;
    this.dialogService
      .openEpisodeFormDialog('create', topic.id, undefined, nextEp)
      .afterClosed()
      .subscribe((res) => {
        if (res) this.loadCourse();
      });
  }

  editEpisode(topic: any, episode: any): void {
    this.dialogService
      .openEpisodeFormDialog('edit', topic.id, episode)
      .afterClosed()
      .subscribe((res) => {
        if (res) this.loadCourse();
      });
  }

  deleteEpisode(episode: any): void {
    this.dialogService
      .openConfirmation(
        'Delete Episode?',
        `Delete "EP ${episode.episodeNumber}: ${episode.title}"?`,
        'Delete',
        'Cancel',
        'danger',
      )
      .subscribe((ok) => {
        if (!ok) return;
        this.curriculumService.deleteEpisode(episode.id).subscribe({
          next: () => {
            this.notification.success('Episode deleted');
            this.loadCourse();
          },
          error: (err) => this.errorHandler.handle(err, 'Failed to delete episode'),
        });
      });
  }

  moveEpisode(topic: any, index: number, delta: number): void {
    const episodes = [...topic.episodes];
    const target = index + delta;
    if (target < 0 || target >= episodes.length) return;
    [episodes[index], episodes[target]] = [episodes[target], episodes[index]];
    topic.episodes = episodes;
    const orderedIds = episodes.map((e: any) => e.id);
    this.curriculumService.reorderEpisodes(topic.id, orderedIds).subscribe({
      next: () => this.loadCourse(),
      error: (err) => {
        this.loadCourse();
        this.errorHandler.handle(err, 'Failed to reorder episodes');
      },
    });
  }

  onAttachmentPicked(event: Event, episode: any): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingEpisodeId = episode.id;
    this.uploadProgress = 0;

    this.mediaService.uploadFile(file, 'material').subscribe({
      next: ({ progress, uuid, filename, size, contentType }) => {
        this.uploadProgress = progress;
        if (uuid) {
          this.curriculumService
            .addAttachment(episode.id, {
              title: filename || file.name,
              originalFilename: filename || file.name,
              fileUuid: uuid,
              fileSize: size ?? file.size,
              contentType: contentType || file.type,
            })
            .pipe(finalize(() => (this.uploadingEpisodeId = null)))
            .subscribe({
              next: () => {
                this.notification.success('Study material attached');
                this.loadCourse();
              },
              error: (err) => this.errorHandler.handle(err, 'Failed to save attachment'),
            });
        }
      },
      error: (err) => {
        this.uploadingEpisodeId = null;
        this.uploadProgress = 0;
        this.errorHandler.handle(err, 'Failed to upload file');
      },
    });
    input.value = '';
  }

  deleteAttachment(att: any): void {
    this.curriculumService.deleteAttachment(att.id).subscribe({
      next: () => {
        this.notification.success('Attachment removed');
        this.loadCourse();
      },
      error: (err) => this.errorHandler.handle(err, 'Failed to remove attachment'),
    });
  }

  openAttachment(att: any, download: boolean): void {
    const url = this.mediaService.getMaterialUrl(att.fileUuid, att.originalFilename, download);
    if (url) window.open(url, '_blank');
  }

  addQuiz(episode: any): void {
    this.dialogService
      .openQuizBuilderDialog(episode.id)
      .afterClosed()
      .subscribe((res) => {
        if (res) this.loadCourse();
      });
  }

  editQuiz(episode: any, quiz: any): void {
    this.dialogService
      .openQuizBuilderDialog(episode.id, quiz.id)
      .afterClosed()
      .subscribe((res) => {
        if (res) this.loadCourse();
      });
  }

  deleteQuiz(quiz: any): void {
    this.dialogService
      .openConfirmation('Delete Quiz?', `Delete "${quiz.title}"?`, 'Delete', 'Cancel', 'danger')
      .subscribe((ok) => {
        if (!ok) return;
        this.quizService.deleteQuiz(quiz.id).subscribe({
          next: () => {
            this.notification.success('Quiz deleted');
            this.loadCourse();
          },
          error: (err) => this.errorHandler.handle(err, 'Failed to delete quiz'),
        });
      });
  }
}
