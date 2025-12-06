"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import AddressAutocomplete from "@/components/AddressAutocomplete";

// Dynamisk import av kart-komponenten
const ParkingSpotDrawMap = dynamic(() => import("@/components/ParkingSpotDrawMap"), {
	ssr: false,
});

interface ParkingSpot {
	id: string;
	type: "UTENDORS" | "INNENDORS";
	address: string;
	latitude: number | null;
	longitude: number | null;
	imageUrl: string | null;
	qrCode: string | null;
	pricePerHour: number;
	description: string | null;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	// Polygon-koordinater
	rectCorner1Lat?: number | null;
	rectCorner1Lng?: number | null;
	rectCorner2Lat?: number | null;
	rectCorner2Lng?: number | null;
	rectCorner3Lat?: number | null;
	rectCorner3Lng?: number | null;
	rectCorner4Lat?: number | null;
	rectCorner4Lng?: number | null;
}

export default function ParkingSpotDetailPage() {
	const { data: session } = useSession();
	const router = useRouter();
	const params = useParams();
	const id = params.id as string;

	const [parkingSpot, setParkingSpot] = useState<ParkingSpot | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [isEditing, setIsEditing] = useState(false);
	const [editData, setEditData] = useState({
		address: "",
		description: "",
		pricePerHour: "",
		isActive: true,
		imageUrl: "",
		latitude: "",
		longitude: "",
		// Polygon-koordinater
		rectCorner1Lat: "",
		rectCorner1Lng: "",
		rectCorner2Lat: "",
		rectCorner2Lng: "",
		rectCorner3Lat: "",
		rectCorner3Lng: "",
		rectCorner4Lat: "",
		rectCorner4Lng: "",
	});
	const [saving, setSaving] = useState(false);
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [uploadingImage, setUploadingImage] = useState(false);
	const [gettingLocation, setGettingLocation] = useState(false);
	const [gettingAddressLocation, setGettingAddressLocation] = useState(false);

	useEffect(() => {
		if (id) {
			fetchParkingSpot();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id]);

	const fetchParkingSpot = async () => {
		try {
			const response = await fetch(`/api/parking-spots/${id}`);
			if (!response.ok) {
				throw new Error("Kunne ikke hente parkeringsplass");
			}
			const data = await response.json();
			setParkingSpot(data);
			setEditData({
				address: data.address,
				description: data.description || "",
				pricePerHour: data.pricePerHour.toString(),
				isActive: data.isActive,
				imageUrl: data.imageUrl || "",
				latitude: data.latitude?.toString() || "",
				longitude: data.longitude?.toString() || "",
				// Polygon-koordinater
				rectCorner1Lat: data.rectCorner1Lat?.toString() || "",
				rectCorner1Lng: data.rectCorner1Lng?.toString() || "",
				rectCorner2Lat: data.rectCorner2Lat?.toString() || "",
				rectCorner2Lng: data.rectCorner2Lng?.toString() || "",
				rectCorner3Lat: data.rectCorner3Lat?.toString() || "",
				rectCorner3Lng: data.rectCorner3Lng?.toString() || "",
				rectCorner4Lat: data.rectCorner4Lat?.toString() || "",
				rectCorner4Lng: data.rectCorner4Lng?.toString() || "",
			});
			if (data.imageUrl) {
				setImagePreview(data.imageUrl);
			}
		} catch (err) {
			setError("Kunne ikke laste parkeringsplass");
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	const handleSave = async () => {
		setSaving(true);
		setError("");

		// Valider at polygon-koordinater er satt hvis de skal oppdateres
		if (
			editData.rectCorner1Lat &&
			editData.rectCorner1Lng &&
			editData.rectCorner2Lat &&
			editData.rectCorner2Lng &&
			editData.rectCorner3Lat &&
			editData.rectCorner3Lng &&
			editData.rectCorner4Lat &&
			editData.rectCorner4Lng
		) {
			// Alle koordinater er satt - OK
		} else if (
			editData.rectCorner1Lat ||
			editData.rectCorner1Lng ||
			editData.rectCorner2Lat ||
			editData.rectCorner2Lng ||
			editData.rectCorner3Lat ||
			editData.rectCorner3Lng ||
			editData.rectCorner4Lat ||
			editData.rectCorner4Lng
		) {
			// Noen koordinater er satt, men ikke alle
			setError("Alle polygon-koordinater må være satt. Vennligst tegn parkeringsplassen på kartet.");
			setSaving(false);
			return;
		}

		try {
			const updatePayload: any = {
				address: editData.address,
				description: editData.description || undefined,
				pricePerHour: parseFloat(editData.pricePerHour),
				isActive: editData.isActive,
				imageUrl: editData.imageUrl || undefined,
			};

			// Legg til GPS-koordinater hvis de er satt
			if (editData.latitude && editData.longitude) {
				updatePayload.latitude = parseFloat(editData.latitude);
				updatePayload.longitude = parseFloat(editData.longitude);
			}

			// Legg til polygon-koordinater hvis de er satt
			if (
				editData.rectCorner1Lat &&
				editData.rectCorner1Lng &&
				editData.rectCorner2Lat &&
				editData.rectCorner2Lng &&
				editData.rectCorner3Lat &&
				editData.rectCorner3Lng &&
				editData.rectCorner4Lat &&
				editData.rectCorner4Lng
			) {
				updatePayload.rectCorner1Lat = parseFloat(editData.rectCorner1Lat);
				updatePayload.rectCorner1Lng = parseFloat(editData.rectCorner1Lng);
				updatePayload.rectCorner2Lat = parseFloat(editData.rectCorner2Lat);
				updatePayload.rectCorner2Lng = parseFloat(editData.rectCorner2Lng);
				updatePayload.rectCorner3Lat = parseFloat(editData.rectCorner3Lat);
				updatePayload.rectCorner3Lng = parseFloat(editData.rectCorner3Lng);
				updatePayload.rectCorner4Lat = parseFloat(editData.rectCorner4Lat);
				updatePayload.rectCorner4Lng = parseFloat(editData.rectCorner4Lng);
			}

			const response = await fetch(`/api/parking-spots/${id}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(updatePayload),
			});

			if (!response.ok) {
				const data = await response.json();
				setError(data.error || "Kunne ikke oppdatere parkeringsplass");
				return;
			}

			const updated = await response.json();
			setParkingSpot(updated);
			setIsEditing(false);
		} catch (err) {
			setError("Noe gikk galt ved oppdatering");
			console.error(err);
		} finally {
			setSaving(false);
		}
	};

	const getCurrentLocation = () => {
		if (!navigator.geolocation) {
			setError("Geolokasjon støttes ikke av nettleseren");
			return;
		}

		setGettingLocation(true);
		navigator.geolocation.getCurrentPosition(
			(position) => {
				setEditData({
					...editData,
					latitude: position.coords.latitude.toString(),
					longitude: position.coords.longitude.toString(),
				});
				setGettingLocation(false);
			},
			(error) => {
				setError("Kunne ikke hente lokasjon: " + error.message);
				setGettingLocation(false);
			}
		);
	};

	const getAddressLocation = async () => {
		if (!editData.address || editData.address.trim() === "") {
			setError("Vennligst skriv inn en adresse først");
			return;
		}

		setGettingAddressLocation(true);
		setError("");

		try {
			// Use Nominatim (OpenStreetMap) for geocoding
			const response = await fetch(
				`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(editData.address)}&limit=1`,
				{
					headers: {
						'User-Agent': 'Parkshare App'
					}
				}
			);

			if (!response.ok) {
				throw new Error("Kunne ikke hente adresse");
			}

			const data = await response.json();

			if (data && data.length > 0) {
				const result = data[0];
				setEditData({
					...editData,
					latitude: result.lat,
					longitude: result.lon,
				});
			} else {
				setError("Kunne ikke finne adressen. Prøv en mer spesifikk adresse.");
			}
		} catch (err) {
			setError("Kunne ikke hente lokasjon for adressen: " + (err instanceof Error ? err.message : "Ukjent feil"));
		} finally {
			setGettingAddressLocation(false);
		}
	};

	const handleVertexAdded = useCallback((lat: number, lng: number) => {
		// Real-time update av koordinater når vertex legges til
		// Dette er allerede håndtert av onPolygonDrawn, men vi kan bruke dette for logging
		console.log("Vertex added:", lat, lng);
	}, []);

	const handleDelete = async () => {
		if (!confirm("Er du sikker på at du vil slette denne parkeringsplassen?")) {
			return;
		}

		try {
			const response = await fetch(`/api/parking-spots/${id}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				const data = await response.json();
				alert(data.error || "Kunne ikke slette parkeringsplass");
				return;
			}

			router.push("/dashboard/parking-spots");
		} catch (err) {
			alert("Noe gikk galt ved sletting");
			console.error(err);
		}
	};

	if (!session || session.user.userType !== "UTLEIER") {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold mb-4">Ingen tilgang</h1>
					<Link href="/dashboard" className="text-blue-600 hover:underline">
						Tilbake til dashboard
					</Link>
				</div>
			</div>
		);
	}

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<p className="text-gray-600">Laster parkeringsplass...</p>
			</div>
		);
	}

	if (error && !parkingSpot) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<p className="text-red-600 mb-4">{error}</p>
					<Link
						href="/dashboard/parking-spots"
						className="text-blue-600 hover:underline"
					>
						Tilbake til oversikt
					</Link>
				</div>
			</div>
		);
	}

	if (!parkingSpot) {
		return null;
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<nav className="bg-white shadow-sm">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between h-16">
						<div className="flex items-center">
							<Link
								href="/dashboard"
								className="text-xl font-bold text-blue-600"
							>
								Parkshare
							</Link>
						</div>
						<div className="flex items-center gap-4">
							<Link
								href="/dashboard/parking-spots"
								className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
							>
								Tilbake til oversikt
							</Link>
						</div>
					</div>
				</div>
			</nav>

			<main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
				<div className="px-4 py-6 sm:px-0">
					<div className="flex justify-between items-center mb-6">
						<h1 className="text-3xl font-bold text-gray-900">
							Parkeringsplass detaljer
						</h1>
						{!isEditing && (
							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => setIsEditing(true)}
									className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
								>
									Rediger
								</button>
								<button
									type="button"
									onClick={handleDelete}
									className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
								>
									Slett
								</button>
							</div>
						)}
					</div>

					{error && (
						<div className="rounded-md bg-red-50 p-4 mb-4">
							<p className="text-sm text-red-800">{error}</p>
						</div>
					)}

					<div className="bg-white shadow rounded-lg overflow-hidden">
						{parkingSpot.imageUrl && (
							// eslint-disable-next-line @next/next/no-img-element
							<img
								src={parkingSpot.imageUrl}
								alt={parkingSpot.address}
								className="w-full h-64 object-cover"
							/>
						)}

						<div className="p-6">
							{isEditing ? (
								<div className="space-y-4">
									<div>
										<label
											htmlFor="edit-address"
											className="block text-sm font-medium text-gray-700"
										>
											Adresse *
										</label>
										<AddressAutocomplete
											id="edit-address"
											value={editData.address}
											onChange={(address) =>
												setEditData({ ...editData, address })
											}
											onSelect={(address, lat, lon) => {
												setEditData({
													...editData,
													address,
													latitude: lat,
													longitude: lon,
												})
											}}
											required
											className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
											placeholder="Gateadresse, postnummer, by"
										/>
									</div>

									<div>
										<label
											htmlFor="edit-price"
											className="block text-sm font-medium text-gray-700"
										>
											Pris per time (NOK) *
										</label>
										<input
											id="edit-price"
											type="number"
											step="0.01"
											value={editData.pricePerHour}
											onChange={(e) =>
												setEditData({
													...editData,
													pricePerHour: e.target.value,
												})
											}
											className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
										/>
									</div>

									<div>
										<label
											htmlFor="edit-description"
											className="block text-sm font-medium text-gray-700"
										>
											Beskrivelse
										</label>
										<textarea
											id="edit-description"
											rows={4}
											value={editData.description}
											onChange={(e) =>
												setEditData({
													...editData,
													description: e.target.value,
												})
											}
											className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
										/>
									</div>

									<div>
										<label className="block text-sm font-semibold text-gray-700 mb-2">
											Bilde
										</label>

										{imagePreview ? (
											<div className="mb-4">
												<img
													src={imagePreview}
													alt="Forhåndsvisning"
													className="w-full h-48 object-cover rounded-lg border border-gray-200"
												/>
												<button
													type="button"
													onClick={() => {
														setImagePreview(null);
														setImageFile(null);
														setEditData({ ...editData, imageUrl: "" });
													}}
													className="mt-2 text-sm text-red-600 hover:text-red-700"
												>
													Fjern bilde
												</button>
											</div>
										) : (
											<div className="mb-4">
												<label
													htmlFor="edit-image-upload"
													className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
												>
													<div className="flex flex-col items-center justify-center pt-5 pb-6">
														<svg
															className="w-8 h-8 mb-2 text-gray-500"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth={2}
																d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
															/>
														</svg>
														<p className="mb-2 text-sm text-gray-500">
															<span className="font-semibold">
																Klikk for å laste opp
															</span>{" "}
															eller dra og slipp
														</p>
														<p className="text-xs text-gray-500">
															PNG, JPG, WebP (maks 5MB)
														</p>
													</div>
													<input
														id="edit-image-upload"
														name="edit-image-upload"
														type="file"
														accept="image/*"
														onChange={async (e) => {
															const file = e.target.files?.[0];
															if (!file) return;

															if (!file.type.startsWith("image/")) {
																setError("Kun bilder er tillatt");
																return;
															}

															if (file.size > 5 * 1024 * 1024) {
																setError(
																	"Bildet er for stort. Maksimal størrelse er 5MB.",
																);
																return;
															}

															setImageFile(file);
															setUploadingImage(true);
															setError("");

															try {
																const reader = new FileReader();
																reader.onloadend = () => {
																	setImagePreview(reader.result as string);
																};
																reader.readAsDataURL(file);

																const uploadFormData = new FormData();
																uploadFormData.append("file", file);

																const uploadResponse = await fetch(
																	"/api/upload/image",
																	{
																		method: "POST",
																		body: uploadFormData,
																	},
																);

																if (!uploadResponse.ok) {
																	const uploadError =
																		await uploadResponse.json();
																	throw new Error(
																		uploadError.error ||
																			"Kunne ikke laste opp bilde",
																	);
																}

																const uploadData = await uploadResponse.json();
																setEditData({
																	...editData,
																	imageUrl: uploadData.url,
																});
															} catch (err) {
																setError(
																	err instanceof Error
																		? err.message
																		: "Kunne ikke laste opp bilde",
																);
																setImageFile(null);
																setImagePreview(null);
															} finally {
																setUploadingImage(false);
															}
														}}
														disabled={uploadingImage}
														className="hidden"
													/>
												</label>
												{uploadingImage && (
													<p className="mt-2 text-sm text-blue-600">
														Laster opp bilde...
													</p>
												)}
											</div>
										)}

										<div className="text-sm text-gray-500">
											<p>Eller legg inn en bilde-URL:</p>
											<input
												id="edit-image-url"
												type="url"
												value={
													editData.imageUrl && !imagePreview
														? editData.imageUrl
														: ""
												}
												onChange={(e) => {
													if (!imagePreview) {
														setEditData({
															...editData,
															imageUrl: e.target.value,
														});
													}
												}}
												disabled={!!imagePreview}
												className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
												placeholder="https://example.com/image.jpg"
											/>
										</div>
									</div>

									<div className="space-y-4">
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-2">
												Rediger parkeringsplass på kartet *
											</label>
											<p className="text-sm text-gray-600 mb-2">
												Klikk på "Start tegning" knappen nederst til venstre på kartet og tegn en firkant som representerer parkeringsplassen. 
												Du må tegne nøyaktig 4 hjørnepunkter. Du kan dra punktene for å justere posisjonen.
											</p>
											<div className="flex gap-2 mb-2">
												<button
													type="button"
													onClick={getCurrentLocation}
													disabled={gettingLocation}
													className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
												>
													{gettingLocation ? "Henter lokasjon..." : "Senter kart på min lokasjon"}
												</button>
												<button
													type="button"
													onClick={getAddressLocation}
													disabled={gettingAddressLocation || !editData.address || editData.address.trim() === ""}
													className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
												>
													{gettingAddressLocation ? "Henter adresse..." : "Senter kart på adresse"}
												</button>
											</div>
										</div>
										<div className="h-96 border border-gray-300 rounded-lg overflow-hidden">
											<ParkingSpotDrawMap
												center={
													editData.latitude && editData.longitude
														? {
																lat: parseFloat(editData.latitude),
																lng: parseFloat(editData.longitude),
															}
														: parkingSpot.latitude && parkingSpot.longitude
															? {
																	lat: parkingSpot.latitude,
																	lng: parkingSpot.longitude,
																}
															: undefined
												}
												onPolygonDrawn={(corners) => {
													setEditData((prevData) => ({
														...prevData,
														latitude: corners.centerLat.toString(),
														longitude: corners.centerLng.toString(),
														rectCorner1Lat: corners.rectCorner1Lat.toString(),
														rectCorner1Lng: corners.rectCorner1Lng.toString(),
														rectCorner2Lat: corners.rectCorner2Lat.toString(),
														rectCorner2Lng: corners.rectCorner2Lng.toString(),
														rectCorner3Lat: corners.rectCorner3Lat.toString(),
														rectCorner3Lng: corners.rectCorner3Lng.toString(),
														rectCorner4Lat: corners.rectCorner4Lat.toString(),
														rectCorner4Lng: corners.rectCorner4Lng.toString(),
													}));
												}}
												onVertexAdded={handleVertexAdded}
												initialPolygon={
													editData.rectCorner1Lat &&
													editData.rectCorner1Lng &&
													editData.rectCorner2Lat &&
													editData.rectCorner2Lng &&
													editData.rectCorner3Lat &&
													editData.rectCorner3Lng &&
													editData.rectCorner4Lat &&
													editData.rectCorner4Lng
														? {
																rectCorner1Lat: parseFloat(editData.rectCorner1Lat),
																rectCorner1Lng: parseFloat(editData.rectCorner1Lng),
																rectCorner2Lat: parseFloat(editData.rectCorner2Lat),
																rectCorner2Lng: parseFloat(editData.rectCorner2Lng),
																rectCorner3Lat: parseFloat(editData.rectCorner3Lat),
																rectCorner3Lng: parseFloat(editData.rectCorner3Lng),
																rectCorner4Lat: parseFloat(editData.rectCorner4Lat),
																rectCorner4Lng: parseFloat(editData.rectCorner4Lng),
															}
														: parkingSpot.rectCorner1Lat &&
																parkingSpot.rectCorner1Lng &&
																parkingSpot.rectCorner2Lat &&
																parkingSpot.rectCorner2Lng &&
																parkingSpot.rectCorner3Lat &&
																parkingSpot.rectCorner3Lng &&
																parkingSpot.rectCorner4Lat &&
																parkingSpot.rectCorner4Lng
															? {
																	rectCorner1Lat: parkingSpot.rectCorner1Lat,
																	rectCorner1Lng: parkingSpot.rectCorner1Lng,
																	rectCorner2Lat: parkingSpot.rectCorner2Lat,
																	rectCorner2Lng: parkingSpot.rectCorner2Lng,
																	rectCorner3Lat: parkingSpot.rectCorner3Lat,
																	rectCorner3Lng: parkingSpot.rectCorner3Lng,
																	rectCorner4Lat: parkingSpot.rectCorner4Lat,
																	rectCorner4Lng: parkingSpot.rectCorner4Lng,
																}
															: null
												}
												polygonFromInput={
													editData.rectCorner1Lat &&
													editData.rectCorner1Lng &&
													editData.rectCorner2Lat &&
													editData.rectCorner2Lng &&
													editData.rectCorner3Lat &&
													editData.rectCorner3Lng &&
													editData.rectCorner4Lat &&
													editData.rectCorner4Lng
														? {
																rectCorner1Lat: parseFloat(editData.rectCorner1Lat),
																rectCorner1Lng: parseFloat(editData.rectCorner1Lng),
																rectCorner2Lat: parseFloat(editData.rectCorner2Lat),
																rectCorner2Lng: parseFloat(editData.rectCorner2Lng),
																rectCorner3Lat: parseFloat(editData.rectCorner3Lat),
																rectCorner3Lng: parseFloat(editData.rectCorner3Lng),
																rectCorner4Lat: parseFloat(editData.rectCorner4Lat),
																rectCorner4Lng: parseFloat(editData.rectCorner4Lng),
															}
														: null
												}
											/>
										</div>
									</div>

									<div className="flex items-center">
										<input
											type="checkbox"
											id="isActive"
											checked={editData.isActive}
											onChange={(e) =>
												setEditData({ ...editData, isActive: e.target.checked })
											}
											className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
										/>
										<label
											htmlFor="isActive"
											className="ml-2 block text-sm text-gray-900"
										>
											Aktiv (synlig for leietakere)
										</label>
									</div>

									<div className="flex gap-2">
										<button
											type="button"
											onClick={handleSave}
											disabled={saving}
											className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
										>
											{saving ? "Lagrer..." : "Lagre endringer"}
										</button>
										<button
											type="button"
											onClick={() => {
												setIsEditing(false);
												if (parkingSpot) {
													setEditData({
														address: parkingSpot.address,
														description: parkingSpot.description || "",
														pricePerHour: parkingSpot.pricePerHour.toString(),
														isActive: parkingSpot.isActive,
														imageUrl: parkingSpot.imageUrl || "",
														latitude: parkingSpot.latitude?.toString() || "",
														longitude: parkingSpot.longitude?.toString() || "",
														rectCorner1Lat: parkingSpot.rectCorner1Lat?.toString() || "",
														rectCorner1Lng: parkingSpot.rectCorner1Lng?.toString() || "",
														rectCorner2Lat: parkingSpot.rectCorner2Lat?.toString() || "",
														rectCorner2Lng: parkingSpot.rectCorner2Lng?.toString() || "",
														rectCorner3Lat: parkingSpot.rectCorner3Lat?.toString() || "",
														rectCorner3Lng: parkingSpot.rectCorner3Lng?.toString() || "",
														rectCorner4Lat: parkingSpot.rectCorner4Lat?.toString() || "",
														rectCorner4Lng: parkingSpot.rectCorner4Lng?.toString() || "",
													});
												}
											}}
											className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
										>
											Avbryt
										</button>
									</div>
								</div>
							) : (
								<div className="space-y-4">
									<div className="flex justify-between items-start">
										<div>
											<h2 className="text-2xl font-semibold text-gray-900">
												{parkingSpot.address}
											</h2>
											<p className="text-sm text-gray-600 mt-1">
												{parkingSpot.type === "UTENDORS"
													? "Utendørs"
													: "Innendørs/Garasje"}
											</p>
										</div>
										<span
											className={`px-3 py-1 text-sm rounded ${
												parkingSpot.isActive
													? "bg-green-100 text-green-800"
													: "bg-gray-100 text-gray-800"
											}`}
										>
											{parkingSpot.isActive ? "Aktiv" : "Inaktiv"}
										</span>
									</div>

									{parkingSpot.description && (
										<div>
											<h3 className="text-sm font-medium text-gray-700 mb-1">
												Beskrivelse
											</h3>
											<p className="text-gray-900">{parkingSpot.description}</p>
										</div>
									)}

									<div className="grid grid-cols-2 gap-4">
										<div>
											<h3 className="text-sm font-medium text-gray-700 mb-1">
												Pris per time
											</h3>
											<p className="text-2xl font-bold text-blue-600">
												{parkingSpot.pricePerHour} NOK
											</p>
										</div>
										{parkingSpot.latitude && parkingSpot.longitude && (
											<div>
												<h3 className="text-sm font-medium text-gray-700 mb-1">
													GPS-koordinater
												</h3>
												<p className="text-sm text-gray-900">
													{parkingSpot.latitude.toFixed(6)},{" "}
													{parkingSpot.longitude.toFixed(6)}
												</p>
											</div>
										)}
									</div>

									{parkingSpot.qrCode && (
										<div>
											<h3 className="text-sm font-medium text-gray-700 mb-2">
												QR-kode
											</h3>
											<p className="text-sm text-gray-600 mb-2">
												QR-kode for tilgang: {parkingSpot.qrCode}
											</p>
											<p className="text-xs text-gray-600">
												QR-kode vil bli generert som bilde ved booking
											</p>
										</div>
									)}

									<div className="pt-4 border-t">
										<p className="text-xs text-gray-600">
											Opprettet:{" "}
											{new Date(parkingSpot.createdAt).toLocaleDateString(
												"no-NO",
											)}
										</p>
										{parkingSpot.updatedAt !== parkingSpot.createdAt && (
											<p className="text-xs text-gray-600">
												Sist oppdatert:{" "}
												{new Date(parkingSpot.updatedAt).toLocaleDateString(
													"no-NO",
												)}
											</p>
										)}
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
