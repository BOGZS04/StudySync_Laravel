<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StudyScheduleRequest;
use App\Http\Resources\StudyScheduleResource;
use App\Models\StudySchedule;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudyScheduleController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $query = StudySchedule::where('student_id', $request->user()->id);

        if ($request->filled('date')) {
            $query->whereDate('date', $request->input('date'));
        }

        $paginated = $query->orderBy('date')->orderBy('start_time')->paginate($this->perPage($request));

        return $this->success('Study schedules retrieved successfully', [
            'study_schedules' => StudyScheduleResource::collection($paginated->items()),
            'meta' => $this->meta($paginated),
        ]);
    }

    public function store(StudyScheduleRequest $request): JsonResponse
    {
        $schedule = StudySchedule::create([
            ...$request->validated(),
            'student_id' => $request->user()->id,
        ]);

        return $this->success('Study schedule created successfully', [
            'study_schedule' => new StudyScheduleResource($schedule),
        ], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $schedule = StudySchedule::where('student_id', $request->user()->id)->findOrFail($id);

        return $this->success('Study schedule retrieved successfully', [
            'study_schedule' => new StudyScheduleResource($schedule),
        ]);
    }

    public function update(StudyScheduleRequest $request, string $id): JsonResponse
    {
        $schedule = StudySchedule::where('student_id', $request->user()->id)->findOrFail($id);
        $schedule->update($request->validated());

        return $this->success('Study schedule updated successfully', [
            'study_schedule' => new StudyScheduleResource($schedule),
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        StudySchedule::where('student_id', $request->user()->id)->findOrFail($id)->delete();

        return $this->success('Study schedule deleted successfully', null);
    }

    private function perPage(Request $request): int
    {
        return max(1, min((int) $request->input('limit', 10), 100));
    }

    private function meta($paginated): array
    {
        return [
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
        ];
    }
}
