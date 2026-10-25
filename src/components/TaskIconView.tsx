import React from 'react';
import {
  BookOpen,
  AlarmClock,
  Activity,
  Bike,
  Users,
  Shirt,
  Phone,
  Footprints,
  Sprout,
  Sparkles,
  Coffee,
  Code2,
  Briefcase,
  Heart,
  Music,
  Utensils,
} from 'lucide-react';
import { TaskIcon } from '../types/planner';

interface TaskIconViewProps {
  icon: TaskIcon;
  className?: string;
}

export const ICON_LABELS: Record<TaskIcon, string> = {
  book: 'Reading & Study',
  alarm: 'Wake Up & Alarm',
  yoga: 'Yoga & Stretch',
  bike: 'Cycling & Commute',
  users: 'Team & Meetings',
  laundry: 'Chores & Laundry',
  phone: 'Calls & Catch-up',
  run: 'Running & Cardio',
  plant: 'Plants & Home',
  sparkles: 'Planning & Habit',
  coffee: 'Break & Coffee',
  code: 'Coding & Tech',
  briefcase: 'Work & Office',
  heart: 'Health & Self-care',
  music: 'Music & Creative',
  utensils: 'Meals & Cooking',
};

export const TaskIconView: React.FC<TaskIconViewProps> = ({
  icon,
  className = 'w-5 h-5',
}) => {
  switch (icon) {
    case 'book':
      return <BookOpen className={className} />;
    case 'alarm':
      return <AlarmClock className={className} />;
    case 'yoga':
      return <Activity className={className} />;
    case 'bike':
      return <Bike className={className} />;
    case 'users':
      return <Users className={className} />;
    case 'laundry':
      return <Shirt className={className} />;
    case 'phone':
      return <Phone className={className} />;
    case 'run':
      return <Footprints className={className} />;
    case 'plant':
      return <Sprout className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'coffee':
      return <Coffee className={className} />;
    case 'code':
      return <Code2 className={className} />;
    case 'briefcase':
      return <Briefcase className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'music':
      return <Music className={className} />;
    case 'utensils':
      return <Utensils className={className} />;
    default:
      return <BookOpen className={className} />;
  }
};
