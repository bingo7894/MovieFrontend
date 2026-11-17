import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { email } from '@angular/forms/signals';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: false,
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing {
  landingForm!: FormGroup;
  year = new Date().getFullYear();

  constructor(
    private fb: FormBuilder,
    private router: Router,
  ) {
    this.landingForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  login() {
    this.router.navigate(['/login']);
  }

  getStarted() {
    this.router.navigate(['/signup'], {
      queryParams: { email: this.landingForm.value.email },
    });
  }

  reasons = [
    {
      title: 'Structured Topics & EPs',
      text: 'Follow step-by-step courses organized clearly into topics and bite-sized episodes.',
      icon: 'menu_book',
    },
    {
      title: 'Downloadable Materials',
      text: 'Access slides, PDF guides, and source code attachments directly inside every lesson.',
      icon: 'file_download',
    },
    {
      title: 'Interactive Exercises',
      text: 'Test your knowledge with instant auto-graded quizzes and detailed explanations.',
      icon: 'quiz',
    },
    {
      title: 'Progress & Time Notes',
      text: 'Track completion progress, resume right where you left off, and save timestamped notes.',
      icon: 'fact_check',
    },
  ];

  faqs = [
    {
      question: 'What is PulseLearn LMS?',
      answer:
        'PulseLearn LMS is a structured online learning platform with topic-based video episodes, downloadable study materials, and interactive exercises.',
    },
    {
      question: 'How are courses organized?',
      answer:
        'Each course is divided into clear Topics, and each Topic contains numbered Episodes (EP) with videos, attachments, and quizzes.',
    },
    {
      question: 'Can I download study materials?',
      answer:
        'Yes! Every episode can include PDFs, slides, documents, and code archives that you can preview or download anytime.',
    },
    {
      question: 'Does the platform track my learning progress?',
      answer:
        'Yes, your watch time, completed episodes, quiz scores, and personal timestamped notes are automatically saved.',
    },
  ];
}
