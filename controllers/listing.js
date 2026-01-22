// Import the Listing model
const Listing = require("../models/listing");
// Import node-fetch to make API requests (for older versions of Node.js)
const fetch = require("node-fetch"); 

// ------------------- INDEX: Get All Listings -------------------
module.exports.index = async (req, res) => {
  const { country } = req.query;
  let filter = {};
  if (country) {
    filter = { country: { $regex: country, $options: "i" } };
  }
  // Fetch listing documents from the database based on filter
  const allListings = await Listing.find(filter);
  
  // If no listings found for a search, flash error and redirect back to all listings
  if (allListings.length === 0 && country) {
    req.flash("error", "No listings found for your search!");
    return res.redirect("/listings");
  }
  
  // Render the index page with the fetched listings
  res.render("listings/index.ejs", { allListings });
};

// ------------------- NEW FORM: Render Form to Create a Listing -------------------
module.exports.renderNewForm = async (req, res) => {
  // Render the page containing the form for creating a new listing
  res.render("listings/new.ejs");
};

// ------------------- SHOW LISTING: Get Specific Listing Details -------------------
module.exports.showListing = async (req, res) => {
  const { id } = req.params;
  // Find a specific listing by its ID and populate its reviews and owner fields
  let listing = await Listing.findById(id)
    .populate({
      path: "reviews",
      populate: { path: "author" }
    })
    .populate("owner");

  // If the listing doesn't exist, show an error and redirect
  if (!listing) {
    req.flash("error", "The listing you requested does not exist!");
    return res.redirect("/listings");
  }

  // ✅ Auto-update old listings if geometry is missing or using default fallback
  // Check if the current geometry coordinates match the default Delhi coordinates
  const isDefault = listing.geometry && 
                    listing.geometry.coordinates && 
                    listing.geometry.coordinates[0] === 77.209 && 
                    listing.geometry.coordinates[1] === 28.6139;

  // If geometry is missing, incomplete, or set to the default, try to geocode the location
  if (!listing.geometry || !listing.geometry.coordinates || listing.geometry.coordinates.length !== 2 || isDefault) {
    const locationQuery = listing.location;
    if (locationQuery) {
      try {
        // Fetch geocoding data from OpenStreetMap's Nominatim API
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery)}&format=json&limit=1`
        );
        const data = await response.json();

        // If geocoding data is found, update the listing's geometry
        if (data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);

          // Only update and save if coordinates are actually different from what's currently stored
          if (!listing.geometry || listing.geometry.coordinates[0] !== lon || listing.geometry.coordinates[1] !== lat) {
            listing.geometry = {
              type: "Point",
              coordinates: [lon, lat],
            };
            await listing.save();
            console.log(`Updated geometry for listing: ${listing.title}`);
          }
        } else if (!listing.geometry || !listing.geometry.coordinates) {
          // Fallback to Delhi coordinates if location not found and no geometry exists
          listing.geometry = {
            type: "Point",
            coordinates: [77.209, 28.6139], // Delhi
          };
          await listing.save();
          console.log(`Fallback geometry used for: ${listing.title}`);
        }
      } catch (err) {
        console.error(`Error geocoding listing ${listing.title}:`, err);
      }
    }
  }

  // Render the show page with the listing details
  res.render("listings/show.ejs", { listing });
};

// ------------------- CREATE LISTING: Save New Listing to Database -------------------
module.exports.createListing = async (req, res, next) => {
  try {
    // Create a new listing object using data from the request body
    const listingData = req.body.listing;
    // Remove the image field from listingData if it's a string (empty or otherwise)
    // because we will set it properly from req.file or use defaults
    if (typeof listingData.image === "string") {
      delete listingData.image;
    }
    const newListing = new Listing(listingData);
    
    // Set the owner of the new listing to the currently logged-in user
    newListing.owner = req.user._id;

    // Get image URL and filename from the uploaded file (via Multer)
    if (typeof req.file !== "undefined") {
      const url = req.file.path;
      const filename = req.file.filename;
      newListing.image = { url, filename };
    }

    // ✅ Get coordinates from location text using geocoding
    const locationQuery = req.body.listing.location;
    if (locationQuery) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery)}&format=json&limit=1`,
          {
            headers: {
              'User-Agent': 'MajorProject-Wanderlust'
            }
          }
        );
        const data = await response.json();

        if (data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          newListing.geometry = {
            type: "Point",
            coordinates: [lon, lat],
          };
        } else {
          // Fallback to Delhi coordinates if geocoding fails
          newListing.geometry = {
            type: "Point",
            coordinates: [77.209, 28.6139], // Delhi fallback
          };
        }
      } catch (geoErr) {
        console.error("Geocoding error:", geoErr);
        // Fallback to Delhi coordinates if geocoding fails
        newListing.geometry = {
          type: "Point",
          coordinates: [77.209, 28.6139], 
        };
      }
    }

    // Save the new listing document to the database
    await newListing.save();
    req.flash("success", "New listing created!");
    res.redirect("/listings");
  } catch (err) {
    console.error("Error creating listing:", err);
    req.flash("error", "Failed to create listing! " + err.message);
    res.redirect("/listings/new");
  }
};

// ------------------- EDIT LISTING FORM: Render Form to Edit a Listing -------------------
module.exports.editListing = async (req, res) => {
  const { id } = req.params;
  // Find the listing by ID to populate the edit form
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "The listing you requested does not exist!");
    return res.redirect("/listings");
  }

  // Generate a lower-resolution thumbnail URL for previewing the image in the form
  let originalImageUrl = listing.image.url;
  originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");
  res.render("listings/edit.ejs", { listing, originalImageUrl });
};

// ------------------- UPDATE LISTING: Save Changes to an Existing Listing -------------------
module.exports.updateListing = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the current listing document before applying updates
    let listing = await Listing.findById(id);
    if (!listing) {
      req.flash("error", "Listing not found!");
      return res.redirect("/listings");
    }

    const oldLocation = listing.location;
    const newListingData = req.body.listing;
    
    // Remove the image field from newListingData if it's a string
    if (typeof newListingData.image === "string") {
      delete newListingData.image;
    }
    const newLocation = newListingData.location;

    // Update basic listing fields from the form data
    listing = await Listing.findByIdAndUpdate(id, { ...newListingData }, { new: true });

    // ✅ Update image details if a new image file was uploaded
    if (req.file) {
      const url = req.file.path;
      const filename = req.file.filename;
      listing.image = { url, filename };
    }

    // ✅ Update coordinates if the location text changed or if it's currently at default
    const isDefault = listing.geometry && 
                      listing.geometry.coordinates && 
                      listing.geometry.coordinates[0] === 77.209 && 
                      listing.geometry.coordinates[1] === 28.6139;
    
    if (newLocation && (newLocation !== oldLocation || isDefault || !listing.geometry)) {
      try {
        // Re-geocode the new location
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(newLocation)}&format=json&limit=1`
        );
        const data = await response.json();

        if (data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          listing.geometry = {
            type: "Point",
            coordinates: [lon, lat],
          };
        }
      } catch (err) {
        console.error("Error geocoding updated listing:", err);
      }
    }

    // Save all changes to the database
    await listing.save();
    req.flash("success", "Listing updated!");
    res.redirect(`/listings/${id}`);
  } catch (err) {
    console.error("Error updating listing:", err);
    req.flash("error", "Failed to update listing!");
    res.redirect(`/listings/${id}/edit`);
  }
};

// ------------------- DELETE LISTING: Remove a Listing from Database -------------------
module.exports.deleteListing = async (req, res) => {
  const { id } = req.params;
  // Find and delete the listing by its ID
  const deletedListing = await Listing.findByIdAndDelete(id);
  console.log(deletedListing);
  req.flash("success", "Listing deleted!");
  res.redirect("/listings");
};
