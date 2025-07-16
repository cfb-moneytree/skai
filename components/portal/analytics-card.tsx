import React from 'react';

interface AnalyticsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  isPercentage?: boolean;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({ title, value, icon, isPercentage = false }) => {
  return (
    <div className="bg-gradient-to-r from-teal-800 to-cyan-400 text-white rounded-xl shadow-md p-6 flex flex-col items-start h-full">
      <div className="flex items-center justify-between w-full">
        <div className="text-white text-6xl">
          {icon}
        </div>
        <div className="text-6xl font-bold">{value}</div>
      </div>
      <div className="mt-2">
        <p className="text-lg font-bold">{title}</p>
      </div>
    </div>
  );
};

export default AnalyticsCard;