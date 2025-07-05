const SearchBar = ({ searchQuery, setSearchQuery }) => {
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="w-full mt-3 bg-base-100">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search users..."
          className="w-full px-3 py-1.5 lg:px-4 lg:py-2 pr-8 lg:pr-10 text-sm bg-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-base-100 transition-all duration-200 font-sans"
          aria-label="Search for users by name"
          role="searchbox"
        />
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 lg:pr-3 hidden lg:flex">
          <svg
            className="w-5 h-5 text-base-content opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
            />
          </svg>
        </span>
      </div>
    </div>
  );
};

export default SearchBar;
