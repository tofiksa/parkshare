import Link from "next/link";
import Navigation from "@/components/Navigation";

export default function NotFound() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
			<Navigation />
			<main className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-16">
				<div className="text-center max-w-2xl">
					<div className="inline-block mb-6">
						<div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
							<span className="text-white font-bold text-5xl">404</span>
						</div>
					</div>
					<h1 className="text-5xl sm:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
						Side ikke funnet
					</h1>
					<p className="text-xl text-gray-600 mb-8">
						Beklager, siden du leter etter eksisterer ikke eller har blitt
						flyttet.
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Link
							href="/"
							className="px-8 py-4 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl hover:from-blue-700 hover:to-green-700 transition-all shadow-lg hover:shadow-xl font-semibold text-lg transform hover:scale-105"
						>
							Gå til forsiden
						</Link>
						<Link
							href="/dashboard"
							className="px-8 py-4 bg-white text-gray-700 border-2 border-gray-300 rounded-xl hover:border-blue-600 hover:text-blue-600 transition-all font-semibold text-lg"
						>
							Gå til dashboard
						</Link>
					</div>
				</div>
			</main>
		</div>
	);
}
