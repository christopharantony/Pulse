export interface EmptyStatePreset {
  title: string;
  description: string;
}

export const noTasksPreset: EmptyStatePreset = {
  title: 'No tasks yet',
  description: 'Create your first task to start tracking your work.',
};

export const noHabitsPreset: EmptyStatePreset = {
  title: 'No habits yet',
  description: 'Add a habit to start building your streak.',
};

export const noGoalsPreset: EmptyStatePreset = {
  title: 'No goals yet',
  description: 'Set a goal to give your work direction.',
};

export const noProjectsPreset: EmptyStatePreset = {
  title: 'No projects yet',
  description: 'Create a project to organize your work.',
};

export const searchEmptyPreset: EmptyStatePreset = {
  title: 'No results found',
  description: 'Try adjusting your search or filters.',
};
