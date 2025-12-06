"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface AddressDetails {
  house_number?: string
  road?: string
  postcode?: string
  city?: string
  town?: string
  municipality?: string
  county?: string
  country?: string
}

interface AddressSuggestion {
  display_name: string
  lat: string
  lon: string
  place_id: number
  address?: AddressDetails
  type?: string
  class?: string
}

interface AddressAutocompleteProps {
  value: string
  onChange: (address: string) => void
  onSelect?: (address: string, lat: string, lon: string) => void
  placeholder?: string
  required?: boolean
  className?: string
  id?: string
  name?: string
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Gateadresse, postnummer, by",
  required = false,
  className = "",
  id = "address",
  name = "address",
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Format address similar to Google Maps format
  const formatAddress = (suggestion: AddressSuggestion): { primary: string; secondary: string } => {
    const addr = suggestion.address
    if (!addr) {
      // Fallback to display_name if no address details
      const parts = suggestion.display_name.split(",")
      return {
        primary: parts[0]?.trim() || suggestion.display_name,
        secondary: parts.slice(1, 3).join(", ").trim() || ""
      }
    }

    // Build primary address (street address)
    const streetParts: string[] = []
    if (addr.house_number) {
      streetParts.push(addr.house_number)
    }
    if (addr.road) {
      streetParts.push(addr.road)
    }
    const primary = streetParts.length > 0 ? streetParts.join(" ") : (addr.road || suggestion.display_name.split(",")[0])

    // Build secondary address (postcode, city, country)
    const secondaryParts: string[] = []
    if (addr.postcode) {
      secondaryParts.push(addr.postcode)
    }
    const city = addr.city || addr.town || addr.municipality || ""
    if (city) {
      secondaryParts.push(city)
    }
    const secondary = secondaryParts.join(" ").trim()

    return { primary, secondary }
  }

  // Debounced search function
  const searchAddresses = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setIsLoading(true)

    try {
      // Use Nominatim API for address search with better parameters
      // Prioritize addresses and places in Norway
      // Using 'q' parameter for better search results (similar to Google Maps)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&countrycodes=no&addressdetails=1&extratags=1&namedetails=1&accept-language=no&dedupe=1`,
        {
          headers: {
            'User-Agent': 'Parkshare App',
            'Accept-Language': 'no,nb,nn'
          }
        }
      )

      if (!response.ok) {
        throw new Error("Kunne ikke søke etter adresser")
      }

      const data = await response.json()
      
      // Sort and prioritize results similar to Google Maps:
      // 1. Exact addresses (house, building) with house numbers
      // 2. Roads/streets
      // 3. Places (cities, towns)
      const sortedData = data.sort((a: AddressSuggestion, b: AddressSuggestion) => {
        const aHasHouseNumber = a.address?.house_number
        const bHasHouseNumber = b.address?.house_number
        
        // Prioritize addresses with house numbers
        if (aHasHouseNumber && !bHasHouseNumber) return -1
        if (!aHasHouseNumber && bHasHouseNumber) return 1
        
        // Then prioritize roads over other place types
        const aIsRoad = a.class === "highway" || (a.address?.road && a.class === "place")
        const bIsRoad = b.class === "highway" || (b.address?.road && b.class === "place")
        
        if (aIsRoad && !bIsRoad) return -1
        if (!aIsRoad && bIsRoad) return 1
        
        // Finally prioritize places with more address details
        const aDetailCount = Object.keys(a.address || {}).length
        const bDetailCount = Object.keys(b.address || {}).length
        
        return bDetailCount - aDetailCount
      })

      setSuggestions(sortedData.slice(0, 5)) // Limit to 5 best results
      setShowSuggestions(true)
      setSelectedIndex(-1)
    } catch (err) {
      console.error("Error searching addresses:", err)
      setSuggestions([])
      setShowSuggestions(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Debounce search (reduced from 300ms to 200ms for faster response)
    debounceTimeoutRef.current = setTimeout(() => {
      searchAddresses(newValue)
    }, 200)
  }

  // Build formatted address string (Google Maps style)
  const buildFormattedAddress = (suggestion: AddressSuggestion): string => {
    const addr = suggestion.address
    if (!addr) {
      return suggestion.display_name
    }

    const parts: string[] = []
    
    // Street address
    if (addr.house_number && addr.road) {
      parts.push(`${addr.house_number} ${addr.road}`)
    } else if (addr.road) {
      parts.push(addr.road)
    }
    
    // Postcode and city
    const city = addr.city || addr.town || addr.municipality || ""
    if (addr.postcode && city) {
      parts.push(`${addr.postcode} ${city}`)
    } else if (city) {
      parts.push(city)
    } else if (addr.postcode) {
      parts.push(addr.postcode)
    }

    // Return formatted address or fallback to display_name
    return parts.length > 0 ? parts.join(", ") : suggestion.display_name
  }

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    const formattedAddress = buildFormattedAddress(suggestion)
    onChange(formattedAddress)
    setShowSuggestions(false)
    setSuggestions([])
    
    if (onSelect) {
      onSelect(formattedAddress, suggestion.lat, suggestion.lon)
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case "Enter":
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex])
        }
        break
      case "Escape":
        setShowSuggestions(false)
        setSuggestions([])
        break
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        required={required}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowSuggestions(true)
          }
        }}
        className={className}
        placeholder={placeholder}
        autoComplete="off"
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-auto"
        >
          {isLoading && (
            <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Søker...
            </div>
          )}
          {suggestions.map((suggestion, index) => {
            const { primary, secondary } = formatAddress(suggestion)
            return (
              <button
                key={suggestion.place_id}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                className={`w-full text-left px-4 py-3 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors ${
                  index === selectedIndex ? "bg-blue-50" : ""
                } ${index < suggestions.length - 1 ? "border-b border-gray-100" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg
                      className={`w-5 h-5 ${index === selectedIndex ? "text-blue-600" : "text-gray-400"}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium text-sm leading-5 ${
                      index === selectedIndex ? "text-blue-900" : "text-gray-900"
                    }`}>
                      {primary}
                    </div>
                    {secondary && (
                      <div className={`text-xs mt-0.5 leading-4 ${
                        index === selectedIndex ? "text-blue-700" : "text-gray-500"
                      }`}>
                        {secondary}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

