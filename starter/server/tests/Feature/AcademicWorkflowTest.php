<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\StudySyncNotification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AcademicWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_teacher_student_assignment_submission_workflow(): void
    {
        $teacher = User::create([
            'name' => 'Teacher One',
            'email' => 'teacher@example.test',
            'role' => UserRole::TEACHER,
            'password' => 'Password1!',
        ]);

        $student = User::create([
            'name' => 'Student One',
            'email' => 'student@example.test',
            'role' => UserRole::STUDENT,
            'password' => 'Password1!',
        ]);

        $classResponse = $this->actingAs($teacher)->postJson('/api/classes', [
            'name' => 'Research Writing',
            'subject' => 'English',
            'section' => 'ENG-101',
            'description' => 'Academic writing fundamentals.',
        ]);

        $classResponse->assertCreated();
        $classId = $classResponse->json('data.class.id');
        $classCode = $classResponse->json('data.class.class_code');

        $this->actingAs($student)->postJson('/api/classes/join', [
            'class_code' => $classCode,
        ])->assertOk();

        $assignmentResponse = $this->actingAs($teacher)->postJson('/api/assignments', [
            'class_id' => $classId,
            'title' => 'Draft Outline',
            'description' => 'Submit a one-page outline.',
            'due_date' => now()->addWeek()->toDateTimeString(),
            'points' => 100,
            'allow_late_submission' => true,
        ]);

        $assignmentResponse->assertCreated();
        $assignmentId = $assignmentResponse->json('data.assignment.id');

        $this->actingAs($student)
            ->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('data.notifications.0.type', 'assignment.created')
            ->assertJsonPath('data.unread_count', 1);

        $submissionResponse = $this->actingAs($student)->postJson("/api/assignments/{$assignmentId}/submissions", [
            'content' => 'Here is my outline.',
        ]);

        $submissionResponse
            ->assertCreated()
            ->assertJsonPath('data.submission.status', 'submitted');
        $submissionId = $submissionResponse->json('data.submission.id');

        $this->actingAs($teacher)->putJson("/api/submissions/{$submissionId}/review", [
            'status' => 'graded',
            'grade' => 95,
            'feedback' => 'Clear structure and strong thesis.',
        ])
            ->assertOk()
            ->assertJsonPath('data.submission.status', 'graded')
            ->assertJsonPath('data.submission.grade', 95);

        $this->actingAs($student)
            ->getJson('/api/student/submissions')
            ->assertOk()
            ->assertJsonPath('data.submissions.0.status', 'graded')
            ->assertJsonPath('data.submissions.0.grade', 95)
            ->assertJsonPath('data.submissions.0.feedback', 'Clear structure and strong thesis.');
    }

    public function test_teacher_can_list_classes_with_active_student_count(): void
    {
        $teacher = User::create([
            'name' => 'Teacher Two',
            'email' => 'teacher-two@example.test',
            'role' => UserRole::TEACHER,
            'password' => 'Password1!',
        ]);

        $student = User::create([
            'name' => 'Student Two',
            'email' => 'student-two@example.test',
            'role' => UserRole::STUDENT,
            'password' => 'Password1!',
        ]);

        $classResponse = $this->actingAs($teacher)->postJson('/api/classes', [
            'name' => 'World History',
            'subject' => 'History',
            'section' => 'HIS-201',
            'description' => 'Modern world history.',
        ]);

        $classResponse->assertCreated();
        $classCode = $classResponse->json('data.class.class_code');

        $this->actingAs($student)->postJson('/api/classes/join', [
            'class_code' => $classCode,
        ])->assertOk();

        $this->actingAs($teacher)
            ->getJson('/api/classes')
            ->assertOk()
            ->assertJsonPath('data.classes.0.name', 'World History')
            ->assertJsonPath('data.classes.0.students_count', 1);
    }

    public function test_student_and_teacher_can_message_after_class_join(): void
    {
        $teacher = User::create([
            'name' => 'Teacher Chat',
            'email' => 'teacher-chat@example.test',
            'role' => UserRole::TEACHER,
            'password' => 'Password1!',
        ]);

        $student = User::create([
            'name' => 'Student Chat',
            'email' => 'student-chat@example.test',
            'role' => UserRole::STUDENT,
            'password' => 'Password1!',
        ]);

        $classResponse = $this->actingAs($teacher)->postJson('/api/classes', [
            'name' => 'Message Class',
            'subject' => 'Advisory',
            'section' => 'ADV-1',
            'description' => 'Class for message testing.',
        ]);

        $this->actingAs($student)->postJson('/api/classes/join', [
            'class_code' => $classResponse->json('data.class.class_code'),
        ])->assertOk();

        $this->actingAs($student)
            ->getJson('/api/messages/contacts')
            ->assertOk()
            ->assertJsonPath('data.contacts.0.email', 'teacher-chat@example.test');

        $messageResponse = $this->actingAs($student)->postJson('/api/messages', [
            'receiver_id' => $teacher->id,
            'content' => 'Hello teacher.',
        ]);

        $messageResponse
            ->assertCreated()
            ->assertJsonPath('data.message.content', 'Hello teacher.');

        $this->actingAs($teacher)
            ->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('data.notifications.0.type', 'message.received')
            ->assertJsonPath('data.unread_count', 1);

        $this->actingAs($teacher)
            ->getJson('/api/messages/conversations')
            ->assertOk()
            ->assertJsonPath('data.conversations.0.sender.name', 'Student Chat');

        $this->actingAs($teacher)
            ->getJson("/api/messages/{$student->id}")
            ->assertOk()
            ->assertJsonPath('data.messages.0.content', 'Hello teacher.');
    }

    public function test_user_can_clear_read_notifications(): void
    {
        $student = User::create([
            'name' => 'Notification Student',
            'email' => 'notification-student@example.test',
            'role' => UserRole::STUDENT,
            'password' => 'Password1!',
        ]);

        $readNotification = StudySyncNotification::create([
            'user_id' => $student->id,
            'type' => 'message.received',
            'title' => 'Read note',
            'message' => 'This has been read.',
            'read_at' => now(),
        ]);

        StudySyncNotification::create([
            'user_id' => $student->id,
            'type' => 'assignment.created',
            'title' => 'Unread note',
            'message' => 'This is still unread.',
        ]);

        $this->actingAs($student)
            ->deleteJson('/api/notifications/read')
            ->assertOk();

        $this->assertDatabaseMissing('notifications', ['id' => $readNotification->id]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $student->id,
            'title' => 'Unread note',
        ]);
    }
}
