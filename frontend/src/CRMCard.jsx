import React from 'react';
import { motion } from 'framer-motion';

const CRMCard = ({ title, value, type = "text", icon: Icon }) => {
  // Simple animations for cards
  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  const renderValue = () => {
    if (type === "interest") {
      const color = value === "High" ? "text-emerald-700 bg-emerald-50 border-emerald-200" : 
                   value === "Medium" ? "text-amber-700 bg-amber-50 border-amber-200" : 
                   "text-rose-700 bg-rose-50 border-rose-200";
      return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${color}`}>
          {value || 'N/A'}
        </span>
      );
    }

    if (type === "sentiment") {
      const color = value === "Positive" ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
                   value === "Hesitant" ? "text-amber-700 bg-amber-50 border-amber-200" :
                   value === "Negative" ? "text-rose-700 bg-rose-50 border-rose-200" :
                   "text-gray-700 bg-gray-100 border-gray-200";
      return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${color}`}>
          {value || 'Neutral'}
        </span>
      );
    }

    if (type === "tags") {
      if (!value || value.length === 0) return <span className="text-gray-400 italic text-sm">No objections identified</span>;
      return (
        <div className="flex flex-wrap gap-2">
          {value.map((tag, i) => (
            <span key={i} className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium">
              {tag}
            </span>
          ))}
        </div>
      );
    }

    if (type === "list") {
      if (!value || value.length === 0) return <span className="text-gray-400 italic text-sm">No next steps</span>;
      return (
        <ul className="space-y-2.5 mt-2">
          {value.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-gray-700 text-sm leading-snug font-medium">
              <span className="mt-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0"></span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    }

    return <span className="text-gray-900 font-semibold">{value || 'Not mentioned'}</span>;
  };

  return (
    <motion.div 
      variants={cardVariants}
      className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group flex flex-col h-full"
    >
      <div className="flex items-center gap-3 mb-4">
        {Icon && (
          <div className="p-2 bg-gray-50 rounded-lg text-gray-500 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <h3 className="text-xs sm:text-sm uppercase tracking-wider text-gray-500 font-bold">{title}</h3>
      </div>
      <div className="flex-1 text-base">
        {renderValue()}
      </div>
    </motion.div>
  );
};

export default CRMCard;
